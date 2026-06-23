import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs'
import { spawn, spawnSync, type ChildProcess } from 'child_process'
import path from 'path'
import os from 'os'
import net from 'net'
import type { DaemonPaths } from './installer'
import { getDaemonPaths } from './installer'

export interface DaemonHandle {
  cliPort: number
  configPath: string
  sessionDir: string
  dbDir: string
  process: ChildProcess
  kill: () => void
}

/**
 * Find a free port in the specified range
 */
export function findFreePort(min = 5000, max = 6000): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      if (port > max) {
        reject(new Error(`No free port found in range ${min}-${max}`))
        return
      }
      const server = net.createServer()
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(port))
      })
      server.on('error', () => tryPort(port + 1))
    }
    tryPort(min)
  })
}

/**
 * Start the storage daemon process
 */
export async function startDaemon(
  useTestnet = false,
  paths?: DaemonPaths
): Promise<DaemonHandle> {
  const resolvedPaths = paths || getDaemonPaths()
  const configPath = useTestnet ? resolvedPaths.testnetConfig : resolvedPaths.mainnetConfig

  // Two ports: cliPort for storage-daemon-cli, adnlPort for peer-to-peer
  const cliPort = await findFreePort(5500, 5600)
  const adnlPort = await findFreePort(5601, 5700)

  // Self-audit (Codex r11 class): use mkdtempSync so two starts in
  // the same Node process never collide, mirroring tonutils-process.
  const sessionDir = mkdtempSync(path.join(os.tmpdir(), `ton-mesh-${process.pid}-`))
  const dbDir = path.join(sessionDir, 'db')
  mkdirSync(dbDir, { recursive: true })

  const child = spawn(resolvedPaths.daemon, [
    '-v', '0',
    '-C', configPath,
    '-p', String(cliPort),
    '-I', `0.0.0.0:${adnlPort}`,
    '-D', dbDir,
  ], {
    stdio: 'ignore',
    detached: false,
  })

  // Capture spawn errors into a checkable variable instead of throwing
  // from the event handler (which becomes an unhandled exception that
  // bypasses the caller's try/catch). Same pattern as tonutils-process.
  // NOTE: a spawn failure (ENOENT / EACCES) emits 'error' ASYNCHRONOUSLY on
  // the next event-loop tick — so the synchronous check below almost never
  // sees it. waitForDaemon polls getSpawnError() so the real cause surfaces
  // within ~200 ms instead of after the full 30 s key-gen timeout.
  let spawnError: Error | undefined
  child.on('error', (err) => { spawnError = err })

  const handle: DaemonHandle = {
    cliPort,
    configPath,
    sessionDir,
    dbDir,
    process: child,
    // Async-safe kill: schedule rmSync via child 'exit', escalate to
    // SIGKILL after 2 s. Same pattern as tonutils-process (Codex r7-10).
    kill: () => {
      if (child.exitCode !== null) {
        try { rmSync(sessionDir, { recursive: true, force: true }) } catch {}
        return
      }
      let cleanedUp = false
      const cleanup = (): void => {
        if (cleanedUp) return
        cleanedUp = true
        try { rmSync(sessionDir, { recursive: true, force: true }) } catch {}
      }
      child.once('exit', cleanup)
      const escalation = setTimeout(() => {
        if (child.exitCode === null) {
          try { child.kill('SIGKILL') } catch {}
          setImmediate(() => { if (!cleanedUp) cleanup() })
        }
      }, 2_000)
      escalation.unref()
      try { child.kill('SIGTERM') } catch {}
    },
  }
  // If the spawn error fired synchronously before we attach handle's
  // listener, surface it now.
  if (spawnError) {
    handle.kill()
    throw new Error(`storage-daemon failed to start: ${spawnError.message}`)
  }

  await waitForDaemon(handle, resolvedPaths, () => spawnError)

  return handle
}

/**
 * Wait for daemon to be ready (CLI keys generated + accepting connections)
 */
async function waitForDaemon(
  handle: DaemonHandle,
  paths: DaemonPaths,
  getSpawnError: () => Error | undefined = () => undefined,
  timeoutMs = 30_000
): Promise<void> {
  const keyDir = path.join(handle.dbDir, 'cli-keys')
  const clientKey = path.join(keyDir, 'client')
  const serverPub = path.join(keyDir, 'server.pub')
  const deadline = Date.now() + timeoutMs

  // A spawn failure (ENOENT: binary missing; EACCES: not executable) surfaces
  // here, since child.on('error') fires asynchronously after startDaemon's
  // synchronous check. Without this the loop below would wait the full 30 s for
  // keys the dead process can never write, then throw a misleading "did not
  // generate CLI keys" error that hides the real ENOENT/EACCES cause. Checked
  // at the top of every poll iteration, so the real cause surfaces within one
  // sleep interval (~200 ms in the key-wait loop, ~500 ms in the connect loop).
  const failFastOnSpawnError = (): void => {
    const err = getSpawnError()
    if (err) {
      handle.kill()
      throw new Error(`storage-daemon failed to start: ${err.message}`)
    }
  }

  // Wait for the daemon to generate its CLI key files (written on first launch)
  while (Date.now() < deadline) {
    failFastOnSpawnError()
    if (existsSync(clientKey) && existsSync(serverPub)) break
    await sleep(200)
  }

  if (!existsSync(clientKey) || !existsSync(serverPub)) {
    failFastOnSpawnError()
    handle.kill()
    throw new Error('storage-daemon did not generate CLI keys within timeout')
  }

  // Then wait for the daemon to accept connections
  while (Date.now() < deadline) {
    failFastOnSpawnError()
    const result = spawnSync(paths.cli, [
      '-v', '0',
      '-I', `127.0.0.1:${handle.cliPort}`,
      '-k', clientKey,
      '-p', serverPub,
      '-c', 'list',
    ], { timeout: 2000, encoding: 'utf8' })

    if (result.status === 0) return
    await sleep(500)
  }

  handle.kill()
  throw new Error('storage-daemon did not become ready within 30 seconds')
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
