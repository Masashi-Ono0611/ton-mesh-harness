import { describe, expect, it, vi } from 'vitest'
import { makeAbortChecker, safeAbort } from '../src/sdk/abort'
import { SdkError } from '../src/sdk/deploy'

describe('makeAbortChecker', () => {
  it('no-op when signal is undefined', () => {
    const check = makeAbortChecker(undefined, 'cancelled')
    expect(() => check()).not.toThrow()
  })

  it('no-op when signal is not aborted', () => {
    const ctrl = new AbortController()
    const check = makeAbortChecker(ctrl.signal, 'cancelled')
    expect(() => check()).not.toThrow()
  })

  it('throws SdkError(ERR_CANCELLED, recoverable) when signal aborted', () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const check = makeAbortChecker(ctrl.signal, 'specific reason')
    try {
      check()
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(SdkError)
      expect((e as SdkError).code).toBe('ERR_CANCELLED')
      expect((e as SdkError).severity).toBe('recoverable')
      expect((e as SdkError).message).toBe('specific reason')
    }
  })

  it('checker is a fresh closure per call — message captured at make time', () => {
    const ctrl = new AbortController()
    const checkA = makeAbortChecker(ctrl.signal, 'reason A')
    const checkB = makeAbortChecker(ctrl.signal, 'reason B')
    ctrl.abort()
    let aMsg = ''
    let bMsg = ''
    try {
      checkA()
    } catch (e) {
      aMsg = (e as SdkError).message
    }
    try {
      checkB()
    } catch (e) {
      bMsg = (e as SdkError).message
    }
    expect(aMsg).toBe('reason A')
    expect(bMsg).toBe('reason B')
  })

  it('repeated calls after abort all throw (no debouncing)', () => {
    const ctrl = new AbortController()
    const check = makeAbortChecker(ctrl.signal, 'cancelled')
    ctrl.abort()
    expect(() => check()).toThrow(SdkError)
    expect(() => check()).toThrow(SdkError)
    expect(() => check()).toThrow(SdkError)
  })
})

describe('safeAbort', () => {
  it('aborts a fresh controller', () => {
    const ctrl = new AbortController()
    safeAbort(ctrl)
    expect(ctrl.signal.aborted).toBe(true)
  })

  it('swallows errors from a controller whose abort throws', () => {
    const ctrl = {
      abort() {
        throw new Error('boom')
      },
    } as unknown as AbortController
    expect(() => safeAbort(ctrl)).not.toThrow()
  })

  it('is idempotent — double-abort does not throw', () => {
    const ctrl = new AbortController()
    safeAbort(ctrl)
    safeAbort(ctrl)
    expect(ctrl.signal.aborted).toBe(true)
  })

  it('aborts only once — subsequent observers still see aborted state', () => {
    const ctrl = new AbortController()
    const onAbort = vi.fn()
    ctrl.signal.addEventListener('abort', onAbort)
    safeAbort(ctrl)
    safeAbort(ctrl)
    expect(onAbort).toHaveBeenCalledTimes(1)
  })
})
