import { describe, expect, it } from 'vitest'
import { formatExpenseAmount, formatFinanceAmount, formatSignedFinanceAmount } from './finance-amounts'

// Intl may use a narrow no-break space as thousands separator and a no-break
// space before "€"? Only the former: normalize whitespace for the assertions.
const plain = (text: string) => text.replace(/[\u202f\u00a0]/g, ' ')

describe('finance amounts', () => {
  it('shows whole euros without decimals and centimes only when non-zero', () => {
    expect(plain(formatFinanceAmount(423400))).toBe('4 234 €')
    expect(plain(formatFinanceAmount(1250))).toBe('12,5 €')
    expect(plain(formatFinanceAmount(1205))).toBe('12,05 €')
    expect(plain(formatFinanceAmount(0))).toBe('0 €')
  })

  it('writes the sign of a negative balance as text', () => {
    expect(plain(formatFinanceAmount(-53700))).toBe('−537 €')
  })

  it('always prefixes an expense with a minus', () => {
    expect(plain(formatExpenseAmount(3800))).toBe('−38 €')
  })

  it('always writes the sign of a variance, zero without sign', () => {
    expect(plain(formatSignedFinanceAmount(1200))).toBe('+12 €')
    expect(plain(formatSignedFinanceAmount(-800))).toBe('−8 €')
    expect(plain(formatSignedFinanceAmount(1))).toBe('+0,01 €')
    expect(plain(formatSignedFinanceAmount(0))).toBe('0 €')
  })
})
