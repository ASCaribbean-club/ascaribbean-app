import { describe, expect, it } from 'vitest'
import {
  MAX_CATEGORY_LABEL_LENGTH,
  MAX_DEBRIEF_LENGTH,
  MAX_EXPENSE_LABEL_LENGTH,
  isValidExpenseAmountCents,
  isValidNonNegativeCents,
  normalizeCategoryLabel,
  validateCategoryLabel,
  validateDebrief,
  validateExpenseDate,
  validateExpenseLabel,
  validateMoneyInput,
} from './finance-form-rules'

describe('validateMoneyInput', () => {
  it.each([
    ['', false, 'required'],
    ['   ', false, 'required'],
    ['abc', false, 'invalid'],
    ['0', false, 'not-positive'],
    ['-5', false, 'negative'],
    ['-5', true, 'negative'],
    ['12.345', false, 'too-many-decimals'],
  ] as const)('rejects %j (allowZero=%s) as %s', (text, allowZero, expected) => {
    expect(validateMoneyInput(text, allowZero)).toBe(expected)
  })

  it.each([['0.01', false], ['150', false], ['150.5', false], ['150,50', false], ['0', true], ['0.00', true]] as const)(
    'accepts %j (allowZero=%s)',
    (text, allowZero) => {
      expect(validateMoneyInput(text, allowZero)).toBeNull()
    },
  )
})

describe('cents guards', () => {
  it('requires a strictly positive integer for an expense', () => {
    expect(isValidExpenseAmountCents(1)).toBe(true)
    expect(isValidExpenseAmountCents(0)).toBe(false)
    expect(isValidExpenseAmountCents(-1)).toBe(false)
    expect(isValidExpenseAmountCents(1.5)).toBe(false)
  })

  it('accepts 0 but not a negative or fractional amount for balances and counts', () => {
    expect(isValidNonNegativeCents(0)).toBe(true)
    expect(isValidNonNegativeCents(500)).toBe(true)
    expect(isValidNonNegativeCents(-1)).toBe(false)
    expect(isValidNonNegativeCents(0.5)).toBe(false)
  })
})

describe('validateExpenseLabel', () => {
  it('rejects an empty or blank label', () => {
    expect(validateExpenseLabel('')).toBe('required')
    expect(validateExpenseLabel('   ')).toBe('required')
  })

  it('accepts exactly the maximum length and rejects one more', () => {
    expect(validateExpenseLabel('a'.repeat(MAX_EXPENSE_LABEL_LENGTH))).toBeNull()
    expect(validateExpenseLabel('a'.repeat(MAX_EXPENSE_LABEL_LENGTH + 1))).toBe('too-long')
  })
})

describe('validateExpenseDate', () => {
  const today = '2026-10-06'
  const seasonStart = '2026-09-01'

  it('accepts today and the season start (boundaries)', () => {
    expect(validateExpenseDate(today, today, seasonStart)).toBeNull()
    expect(validateExpenseDate(seasonStart, today, seasonStart)).toBeNull()
  })

  it('rejects a future date, a date before the season, and an empty date', () => {
    expect(validateExpenseDate('2026-10-07', today, seasonStart)).toBe('in-future')
    expect(validateExpenseDate('2026-08-31', today, seasonStart)).toBe('before-season')
    expect(validateExpenseDate('', today, seasonStart)).toBe('required')
  })
})

describe('validateDebrief', () => {
  it('is optional and bounded', () => {
    expect(validateDebrief('')).toBeNull()
    expect(validateDebrief('a'.repeat(MAX_DEBRIEF_LENGTH))).toBeNull()
    expect(validateDebrief('a'.repeat(MAX_DEBRIEF_LENGTH + 1))).toBe('too-long')
  })
})

describe('category labels', () => {
  it('normalizes case, accents and extra spaces', () => {
    expect(normalizeCategoryLabel('  Équipement ')).toBe('equipement')
    expect(normalizeCategoryLabel('Licences   &  Arbitrage')).toBe('licences & arbitrage')
  })

  const existing = [{ label: 'Équipement' }, { label: 'Buvette' }]

  it('rejects an empty label', () => {
    expect(validateCategoryLabel('   ', existing)).toBe('required')
  })

  it('rejects a duplicate regardless of case and accents', () => {
    expect(validateCategoryLabel('equipement', existing)).toBe('duplicate')
    expect(validateCategoryLabel('BUVETTE ', existing)).toBe('duplicate')
  })

  it('rejects a too-long label and accepts a new one', () => {
    expect(validateCategoryLabel('a'.repeat(MAX_CATEGORY_LABEL_LENGTH + 1), existing)).toBe('too-long')
    expect(validateCategoryLabel('Matériel', existing)).toBeNull()
  })
})
