import { describe, expect, it } from 'vitest'
import {
  MAX_CARRIER_DETAIL_LENGTH,
  MAX_CARRIER_LABEL_LENGTH,
  carrierArchiveBlocker,
  hasCarrierChanged,
  isCarrierKind,
  normalizeCarrierDetail,
  normalizeCarrierLabel,
  validateCarrierDetail,
  validateCarrierLabel,
} from './finance-carrier-rules'

const existing = [
  { id: 'c-1', label: 'Compte courant' },
  { id: 'c-2', label: 'Caisse buvette' },
]

describe('validateCarrierLabel', () => {
  it('accepts a fresh label', () => expect(validateCarrierLabel('Livret', null, existing)).toBeNull())
  it('refuses an empty or whitespace label', () => {
    expect(validateCarrierLabel('', null, existing)).toBe('required')
    expect(validateCarrierLabel('   ', null, existing)).toBe('required')
  })
  it('accepts a label exactly at the maximum and refuses one above', () => {
    expect(validateCarrierLabel('x'.repeat(MAX_CARRIER_LABEL_LENGTH), null, existing)).toBeNull()
    expect(validateCarrierLabel('x'.repeat(MAX_CARRIER_LABEL_LENGTH + 1), null, existing)).toBe('too-long')
  })
  it('measures the length on the normalized label', () => {
    expect(validateCarrierLabel(`  ${'x'.repeat(MAX_CARRIER_LABEL_LENGTH)}  `, null, existing)).toBeNull()
  })
  it('refuses a duplicate ignoring case and accents', () => {
    expect(validateCarrierLabel('COMPTE  courant', null, existing)).toBe('duplicate')
    expect(validateCarrierLabel('Caïsse buvette', null, existing)).toBe('duplicate')
  })
  it('accepts renaming a carrier to itself with another casing', () => {
    expect(validateCarrierLabel('compte COURANT', 'c-1', existing)).toBeNull()
  })
  it('still refuses a collision with ANOTHER carrier on rename', () => {
    expect(validateCarrierLabel('caisse buvette', 'c-1', existing)).toBe('duplicate')
  })
})

describe('validateCarrierDetail', () => {
  it('accepts absent, empty and a detail exactly at the maximum', () => {
    expect(validateCarrierDetail(null)).toBeNull()
    expect(validateCarrierDetail('')).toBeNull()
    expect(validateCarrierDetail('x'.repeat(MAX_CARRIER_DETAIL_LENGTH))).toBeNull()
  })
  it('refuses a detail above the maximum', () => {
    expect(validateCarrierDetail('x'.repeat(MAX_CARRIER_DETAIL_LENGTH + 1))).toBe('too-long')
  })
})

describe('normalizers', () => {
  it('collapses whitespace in the label', () => expect(normalizeCarrierLabel('  A   b ')).toBe('A b'))
  it('turns an empty detail into null and trims otherwise', () => {
    expect(normalizeCarrierDetail('   ')).toBeNull()
    expect(normalizeCarrierDetail(undefined)).toBeNull()
    expect(normalizeCarrierDetail(' Courant ')).toBe('Courant')
  })
})

describe('isCarrierKind', () => {
  it('accepts bank and cash only', () => {
    expect(isCarrierKind('bank')).toBe(true)
    expect(isCarrierKind('cash')).toBe(true)
    expect(isCarrierKind('card')).toBe(false)
    expect(isCarrierKind(undefined)).toBe(false)
  })
})

describe('hasCarrierChanged', () => {
  const before = { label: 'Compte', detail: 'Courant', managerUserId: 'u-1' }
  it('is false for identical (normalized) values', () => {
    expect(hasCarrierChanged(before, { label: ' Compte ', detail: ' Courant ', managerUserId: 'u-1' })).toBe(false)
  })
  it('treats an empty detail and null as the same', () => {
    expect(hasCarrierChanged({ ...before, detail: null }, { ...before, detail: '  ' })).toBe(false)
  })
  it('detects a label, detail or manager change', () => {
    expect(hasCarrierChanged(before, { ...before, label: 'compte' })).toBe(true)
    expect(hasCarrierChanged(before, { ...before, detail: null })).toBe(true)
    expect(hasCarrierChanged(before, { ...before, managerUserId: null })).toBe(true)
  })
})

// specs/finances-member-advances.md §2.5/AC-FA-16 — mirrors archive_finance_carrier().
describe('carrierArchiveBlocker', () => {
  const base = { hasCurrentSeason: true, openingBalanceCents: 10000, incomeCents: 0, expensesPaidCents: 10000 }

  it('is null when the current balance is exactly zero', () => {
    expect(carrierArchiveBlocker(base)).toBeNull()
  })

  it('is null for a combination that cancels out, with an opening balance entered', () => {
    expect(carrierArchiveBlocker({ ...base, openingBalanceCents: 5000, incomeCents: 7000, expensesPaidCents: 12000 })).toBeNull()
  })

  it('accepts an opening balance entered at 0 with nothing else', () => {
    expect(carrierArchiveBlocker({ hasCurrentSeason: true, openingBalanceCents: 0, incomeCents: 0, expensesPaidCents: 0 })).toBeNull()
  })

  it('refuses without a current season, before anything else', () => {
    expect(carrierArchiveBlocker({ ...base, hasCurrentSeason: false, openingBalanceCents: null })).toBe('no-season')
  })

  it('refuses when the opening balance is not entered, even with nothing else ("0 if absent" is not enough)', () => {
    expect(carrierArchiveBlocker({ hasCurrentSeason: true, openingBalanceCents: null, incomeCents: 0, expensesPaidCents: 0 })).toBe('opening-missing')
  })

  it.each([
    ['an opening balance alone', { openingBalanceCents: 100, incomeCents: 0, expensesPaidCents: 0 }],
    ['a payment alone', { openingBalanceCents: 0, incomeCents: 100, expensesPaidCents: 0 }],
    ['an expense alone (negative balance)', { openingBalanceCents: 0, incomeCents: 0, expensesPaidCents: 100 }],
  ])('refuses %s', (_name, figures) => {
    expect(carrierArchiveBlocker({ hasCurrentSeason: true, ...figures })).toBe('non-zero-balance')
  })
})
