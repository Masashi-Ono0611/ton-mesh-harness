/**
 * Programmatic deploy SDK — the seam that powers both the CLI's
 * `runDeployTonutils` adapter and (future) the MCP server's
 * `mesh_deploy` tool.
 *
 * Spec: docs/v0.8/mcp-core-requirements.md §F2 / §F3 / §F4 / §F5.
 *
 * Scope (rc5):
 *   env_check → daemon_starting → bag_creating → bag_uploaded →
 *   [awaiting_signature → dns_signing → dns_confirmed → verifying]? →
 *   done. The DNS phases fire iff `opts.domain` is set, routed through
 *   writeDnsRecord (TonConnect) or writeDnsRecordAgentic depending on
 *   wallet.kind. watch + site-auto remain CLI-only orchestration —
 *   they have no MCP-callable equivalent.
 *
 * NO `console.*` ANYWHERE IN THIS FILE — lint-enforced.
 */

import path from 'path'
import {
  DeployOptionsSchema,
  parseWalletInput,
  type DeployEvent,
  type DeployOptions,
  type DeployResult,
  type ErrCode,
  type WalletSpec,
} from './schemas'
import { ensureTonutilsBinary } from '../daemon/tonutils-installer'
import {
  ensureTonutilsNetworkConfig,
  startTonutilsDaemon,
  tonutilsCreate,
  tonutilsDetails,
  type TonutilsHandle,
} from '../daemon/tonutils-process'
import {
  resolveTunnelConfig as resolveTunnelConfigCore,
  TunnelConfigError,
} from '../utils/tunnel-config'
import { storageOnlyViewabilityHint, tonviewerTxUrl } from './endpoints'
import { createSdkLogger } from './log'
import { emitProvenanceManifest } from './provenance'
import { getTonutilsPaths } from '../daemon/tonutils-installer'
import {
  SEEDS_ROOT,
  installService,
  seedDir,
  serviceLabel,
  stopService,
  type ServiceMeta,
} from '../daemon/service'
import { lingerAdvisory } from '../daemon/linger'
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { join as pathJoin } from 'node:path'

const log = createSdkLogger('mesh:deploy')

// ─────────────────────────────────────────────────────────────────────────────
// Public input shape — accepts the full DeployOptions schema, plus a legacy
// wallet override (string or WalletSpec) for CLI backwards compat.
// ─────────────────────────────────────────────────────────────────────────────

export type DeployInput = Omit<Partial<DeployOptions>, 'wallet'> & {
  source_dir: string
  wallet?: string | WalletSpec
}

export interface DeployControl {
  /**
   * AbortSignal honoured at every event boundary AND just-after the daemon
   * spawns. When fired:
   *  - the SDK kills the daemon (regardless of `keep_alive`);
   *  - in-flight HTTP calls to the daemon will reject (the daemon is gone);
   *  - the generator throws `SdkError(ERR_CANCELLED)` with `phase_at_cancel`
   *    set to the most recent yielded phase (or "env_check" if cancellation
   *    occurred before any yield).
   *
   * Per F4: `may_have_published` is `false` for any cancellation that
   * occurs before `awaiting_signature` fires. Once that phase yields,
   * the flag is path-aware:
   *   - tonconnect: `true` (the QR is shown; user may have approved
   *     out-of-band by the time we abort)
   *   - agentic: `dnsBroadcastEnqueued` (set when `dns_signing` fires,
   *     i.e. after Toncenter accepted the BOC)
   */
  signal?: AbortSignal

  /**
   * Internal hook — fires once with the live `TonutilsHandle` immediately
   * after the daemon spawns. The CLI uses this to capture the real handle
   * for watch-mode re-uploads (so it can call `tonutilsCreate(handle, …)`
   * later without needing the SDK to re-spawn).
   *
   * MCP consumers should NOT use this hook — the MCP server has no
   * persistent watch-mode that needs the underlying ChildProcess.
   *
   * @internal
   */
  onDaemonReady?: (handle: TonutilsHandle) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed error
// ─────────────────────────────────────────────────────────────────────────────

export class SdkError extends Error {
  readonly code: ErrCode
  readonly severity: 'fatal' | 'recoverable'
  readonly fixHint?: string
  readonly data?: Record<string, unknown>

  constructor(
    code: ErrCode,
    message: string,
    options: { severity?: 'fatal' | 'recoverable'; fixHint?: string; data?: Record<string, unknown> } = {},
  ) {
    super(message)
    this.name = 'SdkError'
    this.code = code
    this.severity = options.severity ?? 'fatal'
    this.fixHint = options.fixHint
    this.data = options.data
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Process-local lock — F5 ERR_BUSY: v0.8.0 serialises mesh_deploy
// invocations within a single SDK process. Concurrent calls fail-fast with
// ERR_BUSY rather than colliding on the UDP port / shared db dir.
// ─────────────────────────────────────────────────────────────────────────────

let deployInFlight = false

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a tunnel-config path BEFORE we start the daemon. Wraps the
 * shared core and surfaces `TunnelConfigError` as `ERR_INVALID_INPUT` so
 * bad input never reaches the daemon spawn step.
 */
function validateTunnelConfig(rawPath: string): string {
  try {
    return resolveTunnelConfigCore(rawPath).absPath
  } catch (err) {
    if (err instanceof TunnelConfigError) {
      throw new SdkError('ERR_INVALID_INPUT', err.message, { severity: 'fatal' })
    }
    throw err
  }
}

/**
 * Coerce loose input into a strict DeployOptions. The `wallet` field
 * accepts either a bare string ("Tonkeeper" — legacy CLI) or a structured
 * WalletSpec. Everything else is passed through to the strict zod parser
 * so typos in field names fail loud.
 */
function normalize(rawInput: DeployInput): DeployOptions {
  // Pass the full input to the strict parser (with `wallet` lifted) so
  // unknown top-level keys are rejected by `z.strictObject`.
  const candidate = { ...rawInput, wallet: parseWalletInput(rawInput.wallet) }
  const parsed = DeployOptionsSchema.parse(candidate)
  // Back-compat: a bare `keep_alive: true` (no explicit daemon_mode) maps to
  // the `detached` ownership mode (#37). daemon_mode is the source of truth
  // downstream; keep `keep_alive` in sync so the field stays meaningful.
  if (parsed.daemon_mode === 'embedded' && parsed.keep_alive) {
    parsed.daemon_mode = 'detached'
  }
  parsed.keep_alive = parsed.daemon_mode !== 'embedded'
  return parsed
}

/**
 * Heuristic mapping from `startTonutilsDaemon` failure messages to F5 codes.
 * The daemon-process module throws `Error(message)` for several distinct
 * causes (spawn crash / config gen / port collision / API never came up);
 * we route them to the right ERR_* code by message inspection.
 *
 * @internal Exported for unit tests only. The published SDK surface is
 * curated in `src/sdk.ts` (which omits this); the `export *` in
 * `src/sdk/index.ts` is an internal-only bundle, not a published entry.
 */
export function mapDaemonStartError(err: unknown): SdkError {
  const msg = err instanceof Error ? err.message : String(err)
  // Port-collision check MUST run before the spawn check below: the tonutils
  // daemon reports a lost UDP-port race as "...exited with code N during
  // startup. Most common cause: another process bound the daemon's UDP
  // ListenAddr...". That string contains "exited with code", so without the
  // "UDP ListenAddr"/"bound the daemon" alternatives here it would fall through
  // to the spawn branch and be mislabelled ERR_DAEMON_SPAWN with the wrong fix
  // hint. The added phrases are unique to the port-collision template, so
  // genuine spawn crashes (spawn ENOENT, config-gen) still reach ERR_DAEMON_SPAWN.
  if (/EADDRINUSE|address already in use|udp.*busy|UDP.*in use|UDP ListenAddr|bound the daemon/i.test(msg)) {
    return new SdkError('ERR_PORT_BUSY', `tonutils-storage UDP port collision: ${msg}`, {
      severity: 'fatal',
      fixHint: 'Quit any conflicting tonutils-storage / TON Browser.app instance, then retry.',
    })
  }
  if (/spawn .* ENOENT|exited with code|crashed at start|config-gen/i.test(msg)) {
    return new SdkError('ERR_DAEMON_SPAWN', `tonutils-storage failed to spawn: ${msg}`, {
      severity: 'fatal',
      fixHint: 'Run `npx ton-mesh-harness doctor` to verify the binary is installed and executable.',
    })
  }
  return new SdkError('ERR_DAEMON_API_TIMEOUT', `tonutils-storage HTTP API did not come up: ${msg}`, {
    severity: 'fatal',
  })
}

/**
 * Build an F5 ERR_CANCELLED error with the F4 cancellation contract
 * payload. `may_have_published` is true iff the cancel happened
 * AFTER `awaiting_signature` fired — once that fires, the wallet may
 * sign and broadcast even though we asked to abort.
 */
function buildCancelledError(
  phase: DeployEvent['phase'],
  bag_id: string | null,
  mayHavePublished: boolean = false,
): SdkError {
  return new SdkError('ERR_CANCELLED', `Deploy cancelled at phase ${phase}.`, {
    severity: 'recoverable',
    data: {
      phase_at_cancel: phase,
      may_have_published: mayHavePublished,
      bag_id,
      tx_hash: null,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Async-generator deploy SDK. Yields typed `DeployEvent` values in phase
 * order. The terminal `done` event carries the full `DeployResult`; consumers
 * can also read it from the generator's return value.
 *
 * Daemon lifecycle:
 *   - Normal `keep_alive: false` success → daemon killed BEFORE yielding
 *     the `done` event, so consumers reading the terminal event already
 *     see `seed_status: "stopped"`.
 *   - Normal `keep_alive: true` success → daemon kept alive; CALLER owns
 *     the kill. Ownership transfers BEFORE the `done` yield so a consumer
 *     that breaks at `done` doesn't leak via the generator's `return()`.
 *   - Cancellation (AbortSignal) → daemon ALWAYS killed; throws ERR_CANCELLED.
 *   - Error → daemon ALWAYS killed.
 *
 * Concurrency: this SDK serialises within a process. A second concurrent
 * `deploy()` invocation throws `SdkError(ERR_BUSY)` per F5 / spec §3.2.
 */
export async function* deploy(
  rawInput: DeployInput,
  control: DeployControl = {},
): AsyncGenerator<DeployEvent, DeployResult, void> {
  // ─── Input validation FIRST, before acquiring the in-flight gate.
  //     Validation errors must NEVER leave the gate stuck — that would
  //     deadlock the next call. We do all synchronous parsing here
  //     (input shape, --testnet refusal, tunnel-config) before entering
  //     the try/finally that owns the gate.
  const opts = (() => {
    try {
      return normalize(rawInput)
    } catch (err) {
      if (err instanceof SdkError) throw err
      const msg = err instanceof Error ? err.message : String(err)
      // F5: surface zod_issues in data when the underlying failure
      // was a ZodError — agents render the issue list to humans.
      // Matches the wrapping pattern in src/sdk/check.ts::checkEnv()
      // and src/mcp.ts::handleDeploy().
      const zodIssues =
        err && typeof err === 'object' && (err as { name?: string }).name === 'ZodError'
          ? (err as { issues?: unknown }).issues
          : undefined
      throw new SdkError('ERR_INVALID_INPUT', `Invalid deploy input: ${msg}`, {
        severity: 'fatal',
        ...(zodIssues !== undefined ? { data: { zod_issues: zodIssues } } : {}),
      })
    }
  })()

  // testnet is supported on the tonutils backend since the daemon takes a
  // `--network-config` (resolved + passed at daemon_starting below). The SDK
  // DNS path is already network-aware (networkFromTestnetFlag → testnet
  // toncenter / tonapi / NFT resolution).

  const resolvedTunnel = opts.tunnel_config ? validateTunnelConfig(opts.tunnel_config) : undefined

  // #37: fail fast on `service` mode where the OS service manager isn't
  // wired (Windows) — BEFORE we spawn a daemon / create a bag.
  if (opts.daemon_mode === 'service' && process.platform === 'win32') {
    throw new SdkError(
      'ERR_INVALID_INPUT',
      'daemon_mode "service" is not yet supported on Windows. Use "detached" (CLI) or "embedded".',
      { severity: 'fatal' },
    )
  }

  // ─── F5 ERR_BUSY: process-local serialisation gate. We acquire AFTER
  //     synchronous input validation so a malformed call doesn't hold
  //     the lock; we release in finally below.
  if (deployInFlight) {
    throw new SdkError(
      'ERR_BUSY',
      'Another mesh_deploy call is already in flight in this process; v0.8.0 serialises invocations.',
      {
        severity: 'recoverable',
        fixHint: 'Wait for the in-flight deploy to complete (or be cancelled), then retry.',
      },
    )
  }
  deployInFlight = true

  // ─── Track current phase + known bag_id for accurate F4 cancellation ────
  let currentPhase: DeployEvent['phase'] = 'env_check'
  let knownBagId: string | null = null
  const checkAborted = () => {
    if (control.signal?.aborted) throw buildCancelledError(currentPhase, knownBagId)
  }

  let daemon: TonutilsHandle | undefined
  let signalListener: (() => void) | undefined
  // #37 service mode: provisional persistent db dir (function-scoped so the
  // finally can clean it up if the deploy fails before the rename to
  // seeds/<bag_id>). Set only when daemon_mode === 'service'.
  let provisionalServiceDir: string | undefined

  // Generator-wide cleanup. Runs on every termination path: normal close,
  // throw, return(), and consumer-break. We always release the in-flight
  // gate; we kill the daemon iff we still own it.
  let daemonOwned = true

  log.info('deploy:start', {
    source_dir: opts.source_dir,
    wallet_kind: opts.wallet.kind,
    has_domain: Boolean(opts.domain),
    testnet: opts.testnet,
    keep_alive: opts.keep_alive,
  })

  try {
    // ─── env_check ────────────────────────────────────────────────────────
    checkAborted()
    currentPhase = 'env_check'
    log.debug('phase:env_check')
    yield { phase: 'env_check', message: 'preparing tonutils-storage…' }
    checkAborted()

    try {
      ensureTonutilsBinary({ silent: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new SdkError('ERR_DAEMON_SPAWN', `Could not prepare tonutils-storage binary: ${msg}`, {
        severity: 'fatal',
        fixHint: 'Run `npx ton-mesh-harness doctor` to inspect installer state.',
      })
    }

    checkAborted()

    // ─── daemon_starting ─────────────────────────────────────────────────
    currentPhase = 'daemon_starting'
    yield { phase: 'daemon_starting', message: 'starting tonutils-storage…' }
    checkAborted()

    let networkConfigPath: string | undefined
    try {
      networkConfigPath = await ensureTonutilsNetworkConfig(opts.testnet)
    } catch (err) {
      throw new SdkError(
        'ERR_DAEMON_SPAWN',
        `Could not fetch the testnet global config for tonutils-storage: ${err instanceof Error ? err.message : String(err)}`,
        { severity: 'fatal', fixHint: 'Check network reachability to ton.org, or deploy to mainnet.' },
      )
    }

    // #37 service mode: stage the daemon db in a PROVISIONAL persistent dir
    // under SEEDS_ROOT (same filesystem as the final seeds/<bag_id> → the
    // post-deploy rename is atomic, no EXDEV). bag_id isn't known yet, so we
    // name by pid+time and rename to seeds/<bag_id> once the bag exists.
    let serviceDbDir: string | undefined
    if (opts.daemon_mode === 'service') {
      provisionalServiceDir = pathJoin(SEEDS_ROOT, `.pending-${process.pid}-${Date.now()}`)
      serviceDbDir = pathJoin(provisionalServiceDir, 'db')
      mkdirSync(serviceDbDir, { recursive: true })
    }

    try {
      daemon = await startTonutilsDaemon({
        tunnelConfigPath: resolvedTunnel,
        networkConfigPath,
        dbDir: serviceDbDir,
        // #69: explicit announce knobs (from --announce-ip/--announce-port,
        // already validated by the schema) take precedence over the env vars.
        externalIp: opts.announce_ip ?? undefined,
        listenPort: opts.announce_port ?? undefined,
      })
    } catch (err) {
      throw mapDaemonStartError(err)
    }

    // Internal hook for the CLI to capture the live TonutilsHandle. Fires
    // exactly once, immediately after daemon spawn. Caller (e.g. the CLI's
    // watch-mode setup) can keep a reference for re-uploads. MCP server
    // does not use this hook.
    if (control.onDaemonReady) {
      try {
        control.onDaemonReady(daemon)
      } catch {
        /* hook errors are caller-side; ignore so the deploy continues */
      }
    }

    // Hook AbortSignal → daemon kill, so any in-flight HTTP call we make
    // next will reject. We ALSO checkAborted() in the immediate vicinity;
    // the listener catches abort-during-await cases the polling can't.
    //
    // Guard: check `daemonOwned` before killing. Once the deploy hands the
    // daemon off (service install → OS manager, detached → caller), we set
    // `daemonOwned = false`. The listener must respect that — killing the
    // daemon at that point would tear down a seeder the caller just received
    // or that the OS service just started. (#102/#8)
    const sig = control.signal
    if (sig) {
      signalListener = () => {
        if (!daemonOwned) return
        try {
          daemon?.kill()
        } catch {
          /* ignore */
        }
      }
      sig.addEventListener('abort', signalListener, { once: true })
    }

    checkAborted()

    // Validate daemon pid is a real number (post-waitForApi). If pid is
    // undefined here, something went sideways during spawn.
    const pid = daemon.process.pid
    if (typeof pid !== 'number') {
      throw new SdkError('ERR_DAEMON_SPAWN', 'tonutils-storage spawned without a pid.', {
        severity: 'fatal',
      })
    }

    // ─── bag_creating ────────────────────────────────────────────────────
    // The daemon is up by this point, so we can surface its API URL here.
    // CLI renderers use this to log "tonutils-storage started at <url>"
    // without needing the SDK to expose the daemon handle.
    currentPhase = 'bag_creating'
    yield {
      phase: 'bag_creating',
      message: `creating bag from ${opts.source_dir}`,
      data: { source_dir: opts.source_dir, daemon_api_url: daemon.apiUrl },
    }
    checkAborted()

    // ─── provenance manifest (#34) ──────────────────────────────────────
    // Written BEFORE bag creation so the bag includes it. Best-effort: the
    // helper never throws — a skip is logged, never fatal. Only when a
    // domain is set (an address-less claim for an undeployed bag carries no
    // value). Signed only on the agentic path; TonConnect → unsigned claim.
    if (opts.provenance && opts.domain) {
      const r = emitProvenanceManifest({
        sourceDir: opts.source_dir,
        domain: opts.domain,
        walletKind: opts.wallet.kind,
        testnet: opts.testnet,
        agentic:
          opts.wallet.kind === 'agentic'
            ? { config_path: opts.wallet.config_path, wallet_label: opts.wallet.wallet_label }
            : undefined,
      })
      if (r.written) log.info('provenance:written', { file: r.file, signed: r.signed })
      else log.warn('provenance:skipped', { reason: r.reason })
    }

    let created
    try {
      created = await tonutilsCreate(daemon, {
        path: opts.source_dir,
        description: opts.description ?? path.basename(opts.source_dir),
      })
    } catch (err) {
      // If the cause was abort, the daemon was killed by the listener
      // and tonutilsCreate rejected — re-throw as ERR_CANCELLED.
      if (control.signal?.aborted) throw buildCancelledError('bag_creating', null)
      const msg = err instanceof Error ? err.message : String(err)
      throw new SdkError('ERR_BAG_UPLOAD', `tonutils-storage failed to create bag: ${msg}`, {
        severity: 'fatal',
      })
    }

    knownBagId = created.bag_id
    checkAborted()

    let details
    try {
      details = await tonutilsDetails(daemon, created.bag_id)
    } catch (err) {
      if (control.signal?.aborted) throw buildCancelledError('bag_creating', knownBagId)
      const msg = err instanceof Error ? err.message : String(err)
      throw new SdkError('ERR_BAG_UPLOAD', `Could not fetch bag details: ${msg}`, {
        severity: 'fatal',
      })
    }

    checkAborted()

    // ─── bag_uploaded ────────────────────────────────────────────────────
    currentPhase = 'bag_uploaded'
    yield {
      phase: 'bag_uploaded',
      message: `bag created: ${created.bag_id}`,
      data: {
        bag_id: created.bag_id,
        bag_size_bytes: details.size,
        files_count: details.files_count,
      },
    }
    checkAborted()

    // ─── [S2.5+S2.6] DNS write — both paths wired ────────────────────────
    // F4 cancellation contract (codex-reviewed post-S2.6 BLOCKER 2 fix):
    // - TonConnect path: cancel AFTER `awaiting_signature` (QR shown)
    //   → `may_have_published: true`. The user may have already approved
    //   on their device by the time we abort.
    // - Agentic path: cancel AFTER `awaiting_signature` but BEFORE
    //   `dns_signing` → `may_have_published: false`. No human approval
    //   step exists; sign+broadcast is atomic inside agenticSignAndSend.
    //   The first event that proves the BOC left this process is
    //   `dns_signing` (yielded AFTER sendBoc returned).
    //
    // The agentic generator threads `control.signal` and aborts the
    // pre-broadcast window, so a cancellation that races past
    // awaiting_signature will throw ERR_CANCELLED before any BOC is
    // built. Post-`dns_signing` aborts cannot un-broadcast.
    let messageBoc: string | null = null
    let dnsSubmissionHash: string | null = null
    let dnsTxHash: string | null = null
    if (opts.domain) {
      let dnsAwaitingSignatureSeen = false
      let dnsBroadcastEnqueued = false
      try {
        let inner: AsyncGenerator<
          DeployEvent,
          { message_boc?: string | null; message_hash?: string; tx_hash?: string | null } | undefined,
          void
        >
        if (opts.wallet.kind === 'tonconnect') {
          const { writeDnsRecord } = await import('./dns')
          inner = writeDnsRecord(
            {
              domain: opts.domain,
              bag_id: created.bag_id,
              testnet: opts.testnet,
              connector_name: opts.wallet.connector,
            },
            { signal: control.signal },
          ) as typeof inner
        } else {
          // S2.6 — agentic path
          const { writeDnsRecordAgentic } = await import('./dns')
          inner = writeDnsRecordAgentic(
            {
              domain: opts.domain,
              bag_id: created.bag_id,
              testnet: opts.testnet,
              config_path: opts.wallet.config_path,
              wallet_label: opts.wallet.wallet_label,
            },
            { signal: control.signal },
          ) as typeof inner
        }
        // Manual iteration so we can capture the generator's RETURN value
        // (the DnsWriteResult with message_boc / message_hash / tx_hash) —
        // for-await drops returns.
        //
        // The inner-try / finally pair below is the Codex-pre-GA-review
        // fix: if the OUTER consumer break()s while we're suspended on
        // `yield ev`, the runtime calls `outer.return()`, which throws
        // a return-signal at our yield. That signal flows past the
        // catch (it's not an SdkError), and without the finally below
        // we'd leave `inner` suspended forever — its own finally
        // (TonConnect bridge dispose, AbortController unsubscribe,
        // in-flight Toncenter calls) would never run. The explicit
        // `inner.return(undefined)` cascades cleanup down. No-op on
        // an already-done generator.
        try {
          while (true) {
            const step = await inner.next()
            if (step.done) {
              const v = step.value
              if (v && 'message_boc' in v && v.message_boc) messageBoc = v.message_boc
              if (v && 'message_hash' in v && v.message_hash) dnsSubmissionHash = v.message_hash
              if (v && 'tx_hash' in v && v.tx_hash) dnsTxHash = v.tx_hash
              break
            }
            const ev = step.value
            if (ev.phase === 'awaiting_signature') {
              dnsAwaitingSignatureSeen = true
            }
            if (ev.phase === 'dns_signing') {
              dnsBroadcastEnqueued = true
              const evData = ev.data as
                | { message_boc?: string | null; message_hash?: string }
                | undefined
              if (evData?.message_boc) messageBoc = evData.message_boc
              if (evData?.message_hash) dnsSubmissionHash = evData.message_hash
            }
            if (ev.phase === 'dns_confirmed') {
              const evData = ev.data as { tx_hash?: string | null } | undefined
              if (evData?.tx_hash) dnsTxHash = evData.tx_hash
            }
            currentPhase = ev.phase
            yield ev
          }
        } finally {
          // Cascade: ensure inner's finally runs even if we exited the
          // while loop for any reason. No-op on completed generator.
          await inner.return(undefined as never).catch(() => {})
        }
      } catch (err) {
        if (err instanceof SdkError && err.code === 'ERR_CANCELLED') {
          // Path-aware may_have_published:
          //  - tonconnect: any awaiting_signature → may publish (QR approved on phone)
          //  - agentic:    only dns_signing+ → may publish (BOC reached Toncenter)
          const mayHavePublished =
            opts.wallet.kind === 'tonconnect' ? dnsAwaitingSignatureSeen : dnsBroadcastEnqueued
          throw buildCancelledError(currentPhase, knownBagId, mayHavePublished)
        }
        if (err instanceof SdkError) throw err
        const msg = err instanceof Error ? err.message : String(err)
        throw new SdkError('ERR_INTERNAL', `DNS write failed: ${msg}`, { severity: 'fatal' })
      }
    }

    // ─── Build result + transfer daemon ownership BEFORE final yield ─────
    // (Codex S2 review: ownership flip after `yield done` lets a consumer
    // that breaks early via for-await leak / falsely-kill the daemon.)
    //
    // dns_tx_hash policy (S2.5 + S2.6 + S2.7):
    //   Both paths now resolve the real on-chain tx hash via Toncenter
    //   v3's `transactionsByMessage` lookup. The resolve runs in parallel
    //   with the TONAPI propagation poll — zero added latency on the
    //   happy path. If Toncenter's index hadn't caught up by the time
    //   the DNS poll succeeded, dns_tx_hash falls back to null and we
    //   surface the message_boc / message_hash via next_actions.
    //   - TonConnect: hash derived from Cell.fromBase64(boc).hash() —
    //     IS the inbound message hash for the wallet's external tx.
    //   - Agentic: hash returned directly by Toncenter's sendBoc.
    // next_actions branching is mutually exclusive: emit ONE of
    //   - tx-hash link (happy path, both paths)
    //   - message_hash fallback (agentic, Toncenter index lagged)
    //   - message_boc fallback (TonConnect, Toncenter index lagged or
    //     normalization failed)
    // so consumers see exactly one DNS-tx pointer (Codex S2.7 review MINOR 2).
    const nextActions: { description: string }[] = []
    if (opts.domain && dnsTxHash) {
      nextActions.push({
        description:
          `DNS write confirmed on-chain. Tx hash: ${dnsTxHash}. ` +
          `View: ${tonviewerTxUrl(dnsTxHash, !!opts.testnet)}.`,
      })
    } else if (opts.domain && dnsSubmissionHash) {
      // Agentic path, Toncenter's index hadn't caught up — surface
      // the message hash as a fallback identifier.
      nextActions.push({
        description:
          `DNS write submitted via agentic signing. Toncenter normalized message hash ` +
          `(NOT the on-chain tx hash; indexable on tonviewer): ${dnsSubmissionHash}. ` +
          `Tx hash resolve timed out — look up the resulting tx on https://tonviewer.com ` +
          `(or testnet.tonviewer.com); usually indexed within ~10s of broadcast.`,
      })
    } else if (opts.domain && messageBoc) {
      // TonConnect path, tx hash resolve timed out OR BOC wasn't parseable.
      nextActions.push({
        description:
          `DNS write submitted via TonConnect. Signed-message BOC (NOT the on-chain tx hash): ${messageBoc}. ` +
          `Tx hash resolve timed out — look up the wallet's outgoing transactions on TONAPI within a minute of dispatch.`,
      })
    }

    // ─── daemon ownership (#37: embedded | detached | service) ───────────
    let daemonPid: number | null = null
    let seedStatus: 'seeding' | 'stopped'
    let daemonService: string | null = null

    if (opts.daemon_mode === 'service') {
      // Stop the embedded daemon — its persistent db survives (kill() does
      // NOT rm a caller-supplied dbDir) — then hand the db to the OS service
      // manager so it keeps seeding after we return.
      try {
        daemon.kill()
      } catch {
        /* ignore */
      }
      daemonOwned = false
      // Let the daemon release its UDP/API ports before the unit re-binds them.
      await new Promise((r) => setTimeout(r, 1500))

      const finalDir = seedDir(created.bag_id)
      if (existsSync(finalDir)) {
        // Re-deploy of the same bag — tear down the prior service + dir.
        try {
          stopService(created.bag_id, { removeDb: true })
        } catch {
          /* best-effort */
        }
        try {
          rmSync(finalDir, { recursive: true, force: true })
        } catch {
          /* ignore */
        }
      }
      renameSync(provisionalServiceDir as string, finalDir)
      const meta: ServiceMeta = {
        bag_id: created.bag_id,
        label: serviceLabel(created.bag_id),
        db_dir: pathJoin(finalDir, 'db'),
        api_port: Number(new URL(daemon.apiUrl).port),
        network_config_path: networkConfigPath ?? null,
        daemon_path: getTonutilsPaths().daemon,
        created_at: new Date().toISOString(),
      }
      try {
        installService(meta)
      } catch (err) {
        throw new SdkError(
          'ERR_INTERNAL',
          `Bag created (${created.bag_id}) and staged at ${finalDir}, but installing the OS ` +
            `service unit failed: ${err instanceof Error ? err.message : String(err)}. ` +
            `The daemon is NOT seeding. Retry, or run with --daemon-mode detached.`,
          { severity: 'fatal' },
        )
      }
      daemonService = meta.label
      // OS service manager is now the owner — finally-block and the abort
      // signal listener must NOT kill this daemon. (#102/#8)
      daemonOwned = false
      seedStatus = 'seeding'
      nextActions.push({
        description:
          `Daemon handed to the OS service manager as '${meta.label}', seeding from ${meta.db_dir}. ` +
          `Manage with: \`ton-mesh-harness service list\` / \`service stop ${created.bag_id}\`.`,
      })
      // On a headless Linux VM the systemd --user unit won't restart after an
      // unattended reboot unless lingering is enabled once (#83). Advise it
      // (the kit never runs the privileged command itself).
      const lingerHint = lingerAdvisory()
      if (lingerHint) nextActions.push({ description: lingerHint })
    } else if (opts.daemon_mode === 'detached') {
      // Consumer takes ownership — finally-block must NOT kill the daemon.
      daemonOwned = false
      daemonPid = pid
      seedStatus = 'seeding'
    } else {
      // embedded → kill the daemon BEFORE yielding `done` so the event's
      // seed_status: "stopped" is honest.
      try {
        daemon.kill()
      } catch {
        /* ignore */
      }
      daemonOwned = false
      seedStatus = 'stopped'
    }

    // ─── viewability breadcrumb (#118) ───────────────────────────────────
    // deploy() only ever writes the STORAGE record, so a domain deploy is
    // NOT browser-openable via the ton.run RLDP gateway. The result carried
    // no signal of this, so a "green" deploy could 404 everywhere with no
    // explanation. Surface the storage-vs-site reality + how to get a
    // browser-openable URL. (Placed after seedStatus so the "nothing seeding"
    // note is honest.)
    if (opts.domain) {
      nextActions.push({
        description: storageOnlyViewabilityHint({
          domain: opts.domain,
          seedStatus,
          testnet: opts.testnet,
        }),
      })
    }

    const result: DeployResult = {
      bag_id: created.bag_id,
      bag_size_bytes: details.size,
      dns_tx_hash: dnsTxHash,
      daemon_api_url: daemon.apiUrl,
      daemon_pid: daemonPid,
      seed_status: seedStatus,
      daemon_service: daemonService,
      next_actions: nextActions,
    }

    currentPhase = 'done'
    log.info('deploy:done', {
      bag_id: result.bag_id,
      bag_size_bytes: result.bag_size_bytes,
      dns_tx_hash: result.dns_tx_hash,
      seed_status: result.seed_status,
    })
    yield { phase: 'done', message: 'deploy complete', data: result }

    return result
  } finally {
    if (signalListener && control.signal) {
      try {
        control.signal.removeEventListener('abort', signalListener)
      } catch {
        /* ignore */
      }
    }
    if (daemonOwned && daemon) {
      try {
        daemon.kill()
      } catch {
        /* ignore */
      }
    }
    // #37: if a service-mode deploy failed before the provisional db was
    // renamed to seeds/<bag_id>, remove the leftover provisional dir.
    if (provisionalServiceDir && existsSync(provisionalServiceDir)) {
      try {
        rmSync(provisionalServiceDir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }
    deployInFlight = false
  }
}
