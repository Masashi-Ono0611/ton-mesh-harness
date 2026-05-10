import { describe, it, expect, vi, beforeEach } from 'vitest'
import { watchBuildDir } from '../src/watch'

// Mock chokidar module
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(),
  },
}))

describe('watchBuildDir', () => {
  // The watcher now subscribes to chokidar's `all` event so add/unlink
  // (not just `change`) trigger the redeploy callback. The mock keeps
  // hold of that handler and we invoke it with a synthesized event.
  let allCallback: ((event: string, path: string) => void) | null = null
  let mockClose: vi.Mock

  // Adapter that lets each test trigger the watcher exactly the way
  // chokidar does, without each test having to know about the event arg.
  const fire = (filePath: string, event: string = 'change') => {
    if (allCallback) allCallback(event, filePath)
  }

  beforeEach(async () => {
    const chokidar = await import('chokidar')
    mockClose = vi.fn()
    vi.mocked(chokidar.default).watch.mockReturnValue({
      on: vi.fn((event: string, callback: any) => {
        if (event === 'all') allCallback = callback
        return { close: mockClose }
      }),
      close: mockClose,
    } as any)
    vi.clearAllMocks()
  })

  it('should call onChange after debounce period', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)

    watchBuildDir({
      buildDir: '/test/build',
      onChange,
      debounceMs: 100,
    })

    expect(allCallback).toBeTruthy()
    fire('/test/build/index.html')
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('should debounce rapid changes into single call', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)

    watchBuildDir({
      buildDir: '/test/build',
      onChange,
      debounceMs: 100,
    })

    expect(allCallback).toBeTruthy()
    fire('/test/build/file1.js', 'add')
    fire('/test/build/file2.js', 'change')
    fire('/test/build/file3.js', 'unlink')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('should use 2000ms default debounce', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)

    watchBuildDir({
      buildDir: '/test/build',
      onChange,
    })

    expect(allCallback).toBeTruthy()
    fire('/test/build/index.html')
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(onChange).not.toHaveBeenCalled()
    await new Promise((resolve) => setTimeout(resolve, 2100))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('should return cleanup function that closes watcher', () => {
    const onChange = vi.fn().mockResolvedValue(undefined)
    const stopWatching = watchBuildDir({
      buildDir: '/test/build',
      onChange,
    })

    stopWatching()

    expect(mockClose).toHaveBeenCalled()
  })

  it('should handle onChange errors gracefully', async () => {
    const onChange = vi.fn().mockRejectedValue(new Error('Deploy failed'))

    watchBuildDir({
      buildDir: '/test/build',
      onChange,
      debounceMs: 100,
    })

    expect(allCallback).toBeTruthy()
    fire('/test/build/index.html')
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('ignores chokidar housekeeping events (ready, raw, error)', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)
    watchBuildDir({ buildDir: '/test/build', onChange, debounceMs: 50 })
    expect(allCallback).toBeTruthy()
    // 'ready' / 'raw' must not trigger redeploy
    fire('/anything', 'ready')
    fire('/anything', 'raw')
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(onChange).not.toHaveBeenCalled()
  })
})
