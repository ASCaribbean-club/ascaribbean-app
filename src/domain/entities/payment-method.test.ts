import { describe, expect, it } from 'vitest'
import { isPaymentMethod, PAYMENT_METHODS } from './payment-method'

describe('payment methods', () => {
  // Mirrors the CHECK constraint of membership_payments.payment_method.
  it('lists exactly card, cash, transfer and other', () => {
    expect([...PAYMENT_METHODS]).toEqual(['card', 'cash', 'transfer', 'other'])
  })

  it('accepts each listed value', () => {
    for (const method of PAYMENT_METHODS) expect(isPaymentMethod(method)).toBe(true)
  })

  it.each(['espèces', 'CB', '', null, undefined, 3])('rejects %j', (value) => {
    expect(isPaymentMethod(value)).toBe(false)
  })
})
