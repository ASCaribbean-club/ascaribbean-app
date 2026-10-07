import { describe, expect, it } from 'vitest'
import {
  MAX_CATEGORY_LABEL_LENGTH,
  MAX_DEBRIEF_LENGTH,
  MAX_EXPENSE_LABEL_LENGTH,
  isValidExpenseAmountCents,
  hasCheckpointChanged,
  hasExpenseChanged,
  hasPayerChanged,
  isValidNonNegativeCents,
  normalizeCategoryLabel,
  validateCategoryLabel,
  validateCategoryRename,
  validateDebrief,
  validateExpenseDate,
  validateExpenseLabel,
  validateExpensePayer,
  validateMoneyInput,
  validateReimbursementDate,
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

describe('validateCategoryRename', () => {
  const existing = [
    { id: 'cat-1', label: 'Équipement' },
    { id: 'cat-2', label: 'Buvette' },
  ]

  it('accepts renaming a category to itself with another casing or accents', () => {
    expect(validateCategoryRename('equipement', 'cat-1', existing)).toBeNull()
    expect(validateCategoryRename('ÉQUIPEMENT ', 'cat-1', existing)).toBeNull()
  })

  it('refuses a duplicate of ANOTHER category, case and accent insensitive', () => {
    expect(validateCategoryRename('buvette', 'cat-1', existing)).toBe('duplicate')
    expect(validateCategoryRename('  BUVETTE', 'cat-1', existing)).toBe('duplicate')
  })

  it('refuses a blank or too long label', () => {
    expect(validateCategoryRename('   ', 'cat-1', existing)).toBe('required')
    expect(validateCategoryRename('x'.repeat(MAX_CATEGORY_LABEL_LENGTH + 1), 'cat-1', existing)).toBe('too-long')
    expect(validateCategoryRename('x'.repeat(MAX_CATEGORY_LABEL_LENGTH), 'cat-1', existing)).toBeNull()
  })
})

describe('hasExpenseChanged', () => {
  const base = {
    amountCents: 3800,
    label: 'Trousse',
    spentOn: '2026-10-04',
    categoryId: 'cat-1',
    payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' },
  } as Parameters<typeof hasExpenseChanged>[0]

  it('is false for identical fields, ignoring surrounding spaces of the label', () => {
    expect(hasExpenseChanged(base, { ...base })).toBe(false)
    expect(hasExpenseChanged(base, { ...base, label: '  Trousse ' })).toBe(false)
  })

  it.each([
    ['amount', { amountCents: 3900 }],
    ['label', { label: 'Trousses' }],
    ['date', { spentOn: '2026-10-05' }],
    ['category', { categoryId: 'cat-2' }],
    ['carrier', { payer: { kind: 'carrier', carrierId: 'bank-1', paymentMethod: 'cash' } }],
    ['payment method', { payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'card' } }],
    ['payer kind (carrier to member)', { payer: { kind: 'member', userId: 'member-1', reimbursement: null } }],
  ] as [string, Partial<Parameters<typeof hasExpenseChanged>[0]>][])('is true when the %s changes', (_name, change) => {
    expect(hasExpenseChanged(base, { ...base, ...change })).toBe(true)
  })
})

describe('hasCheckpointChanged', () => {
  const counts = [
    { carrierId: 'bank-1', countedCents: 1000 },
    { carrierId: 'cash-1', countedCents: 500 },
  ]

  it('is false when counts (in any order) and the trimmed debrief are identical', () => {
    expect(hasCheckpointChanged({ counts, debrief: 'RAS' }, { counts: [...counts].reverse(), debrief: ' RAS ' })).toBe(false)
  })

  it('is true when one counted amount changes', () => {
    expect(hasCheckpointChanged({ counts, debrief: '' }, { counts: [counts[0], { carrierId: 'cash-1', countedCents: 501 }], debrief: '' })).toBe(true)
  })

  it('is true when only the debrief changes', () => {
    expect(hasCheckpointChanged({ counts, debrief: 'RAS' }, { counts, debrief: 'Écart expliqué' })).toBe(true)
    expect(hasCheckpointChanged({ counts, debrief: '' }, { counts, debrief: 'a' })).toBe(true)
  })

  it('is true when the set of carriers differs', () => {
    expect(hasCheckpointChanged({ counts, debrief: '' }, { counts: [counts[0]], debrief: '' })).toBe(true)
    expect(hasCheckpointChanged({ counts, debrief: '' }, { counts: [counts[0], { carrierId: 'other', countedCents: 500 }], debrief: '' })).toBe(true)
  })
})

// specs/finances-member-advances.md AC-FA-06.
describe('hasPayerChanged', () => {
  const toReimburse = { kind: 'member', userId: 'member-1', reimbursement: null } as const
  const reimbursed = { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-05', paymentMethod: 'transfer' } } as const

  it('is false for the same payer', () => {
    expect(hasPayerChanged(toReimburse, { ...toReimburse })).toBe(false)
    expect(hasPayerChanged(reimbursed, { ...reimbursed, reimbursement: { ...reimbursed.reimbursement } })).toBe(false)
  })

  it.each([
    ['member to carrier', toReimburse, { kind: 'carrier', carrierId: 'bank-1', paymentMethod: 'card' }],
    ['carrier to member', { kind: 'carrier', carrierId: 'bank-1', paymentMethod: 'card' }, toReimburse],
    ['another member', toReimburse, { ...toReimburse, userId: 'member-2' }],
    ['"À rembourser" to "Remboursé"', toReimburse, reimbursed],
    ['"Remboursé" to "À rembourser"', reimbursed, toReimburse],
    ['reimbursement date', reimbursed, { ...reimbursed, reimbursement: { ...reimbursed.reimbursement, reimbursedOn: '2026-10-06' } }],
    ['reimbursement method', reimbursed, { ...reimbursed, reimbursement: { ...reimbursed.reimbursement, paymentMethod: 'cash' } }],
  ] as [string, Parameters<typeof hasPayerChanged>[0], Parameters<typeof hasPayerChanged>[1]][])('is true for %s', (_name, before, after) => {
    expect(hasPayerChanged(before, after)).toBe(true)
  })
})

describe('validateReimbursementDate', () => {
  it.each([
    ['', 'required'],
    ['2026-10-07', 'in-future'],
    ['2026-10-01', 'before-expense'],
    ['2026-10-06', null], // exactly today
    ['2026-10-02', null], // exactly the expense date
    ['2026-10-04', null],
  ])('%s -> %s', (date, expected) => {
    expect(validateReimbursementDate(date, '2026-10-06', '2026-10-02')).toBe(expected)
  })
})

describe('validateExpensePayer', () => {
  const choices = { activeCarrierIds: ['cash-1'], memberUserIds: ['member-1'] }
  const check = (payer: Parameters<typeof validateExpensePayer>[0]) => validateExpensePayer(payer, '2026-10-02', '2026-10-06', choices)

  it('accepts an active carrier with a valid method', () => {
    expect(check({ kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' })).toBeNull()
  })

  it('refuses an unknown or archived carrier and an invalid method', () => {
    expect(check({ kind: 'carrier', carrierId: 'old-1', paymentMethod: 'cash' })).toBe('carrier-unknown')
    expect(check({ kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'bitcoin' as never })).toBe('payment-method-invalid')
  })

  it('accepts a listed account, to reimburse (no method) or reimbursed', () => {
    expect(check({ kind: 'member', userId: 'member-1', reimbursement: null })).toBeNull()
    expect(check({ kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-06', paymentMethod: 'cash' } })).toBeNull()
  })

  it('refuses a free-text or unknown account', () => {
    expect(check({ kind: 'member', userId: 'Jean', reimbursement: null })).toBe('member-unknown')
  })

  it('bounds the reimbursement date and requires a valid method', () => {
    const reimbursed = (reimbursedOn: string, paymentMethod = 'cash') =>
      check({ kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn, paymentMethod: paymentMethod as never } })
    expect(reimbursed('')).toBe('reimbursement-required')
    expect(reimbursed('2026-10-07')).toBe('reimbursement-in-future')
    expect(reimbursed('2026-10-01')).toBe('reimbursement-before-expense')
    expect(reimbursed('2026-10-03', 'bitcoin')).toBe('payment-method-invalid')
  })
})
