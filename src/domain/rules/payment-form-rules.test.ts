import { describe, expect, it } from 'vitest'
import { validatePaymentAmount, validatePaymentDate } from './payment-form-rules'

describe('validatePaymentAmount', () => {
  it('rejects an empty or blank amount', () => {
    expect(validatePaymentAmount('')).toBe('required')
    expect(validatePaymentAmount('   ')).toBe('required')
  })

  it('rejects zero, negative and non-numeric amounts', () => {
    expect(validatePaymentAmount('0')).toBe('not-positive')
    expect(validatePaymentAmount('-5')).toBe('not-positive')
    expect(validatePaymentAmount('abc')).toBe('not-positive')
  })

  it('rejects more than two decimals', () => {
    expect(validatePaymentAmount('10.123')).toBe('too-many-decimals')
  })

  it('accepts whole, one-decimal and two-decimal amounts', () => {
    expect(validatePaymentAmount('150')).toBeNull()
    expect(validatePaymentAmount('12.5')).toBeNull()
    expect(validatePaymentAmount('0.01')).toBeNull()
    expect(validatePaymentAmount('150.50')).toBeNull()
  })
})

describe('validatePaymentDate', () => {
  it('rejects an empty date', () => {
    expect(validatePaymentDate('', '2026-10-05')).toBe('required')
  })

  it('rejects a future date', () => {
    expect(validatePaymentDate('2026-10-06', '2026-10-05')).toBe('in-future')
  })

  it('accepts today (boundary) and past dates', () => {
    expect(validatePaymentDate('2026-10-05', '2026-10-05')).toBeNull()
    expect(validatePaymentDate('2026-09-12', '2026-10-05')).toBeNull()
  })
})
