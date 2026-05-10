import { describe, it, expect } from 'vitest'
import { noopPaymentClient } from '../src/payments'

describe('noopPaymentClient (v0.6 placeholder)', () => {
  it('reports disabled', () => {
    expect(noopPaymentClient.enabled).toBe(false)
  })

  it('describePayments returns null so callers omit the Payments section', () => {
    expect(noopPaymentClient.describePayments()).toBeNull()
  })

  it('status is a single-line synchronous summary', () => {
    const s = noopPaymentClient.status()
    expect(typeof s).toBe('string')
    expect(s).toMatch(/disabled/i)
    expect(s.split('\n').length).toBe(1)
  })
})
