import chokidar from 'chokidar'
import chalk from 'chalk'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface WatchOptions {
  buildDir: string
  onChange: () => Promise<void>
  debounceMs?: number
}

// -----------------------------------------------------------------------
// File Watching
// -----------------------------------------------------------------------

export function watchBuildDir(opts: WatchOptions): () => void {
  const { buildDir, onChange, debounceMs = 2000 } = opts

  const watcher = chokidar.watch(buildDir, {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,  // Don't trigger on initial scan
  })

  let debounceTimer: NodeJS.Timeout | null = null

  // We need add/change/unlink (and addDir/unlinkDir for completeness).
  // Subscribing only to `change` — as the previous implementation did —
  // misses the case where a build emits new files, deletes old ones, or
  // uses atomic rename writes (chokidar reports those as add/unlink, not
  // change). Codex M1-CO2 caught this on the v0.6 watch path.
  const onAnyEvent = (event: string, filePath: string) => {
    // chokidar's `all` callback fires for ready / raw too — only act on
    // the events that actually mean "build artifacts moved".
    if (!['add', 'change', 'unlink', 'addDir', 'unlinkDir'].includes(event)) return
    console.log(chalk.dim(`${event}: ${filePath}`))

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      try {
        await onChange()
      } catch (err) {
        console.error(chalk.red('Watch error:'), err)
      } finally {
        debounceTimer = null
      }
    }, debounceMs)
  }

  watcher.on('all', onAnyEvent)

  watcher.on('error', (error) => {
    console.error('Watcher error:', error)
  })

  // Return cleanup function
  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    watcher.close()
  }
}
