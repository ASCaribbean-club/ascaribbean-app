import { describe, expect, it } from 'vitest'
import type { CarrierFigures, Expense, ExpenseCategory, FinancesSnapshot, OutstandingAdvance, TreasuryCheckpoint } from '../entities/finance'
import {
  activeCarriers,
  amountsOwedToMembers,
  isCarrierArchived,
  isCarrierListedInTreasury,
  categoriesWithExpenses,
  checkpointTotalVarianceCents,
  expenseTotalsByCategory,
  filterExpensesByCategory,
  isJust,
  lastCountForCarrier,
  monthExpensesCents,
  sortCheckpoints,
  sortExpenses,
  summarizeTreasury,
  sumExpensesCents,
  theoreticalBalanceCents,
  varianceCents,
} from './finance-rules'

function carrier(overrides: Partial<CarrierFigures> = {}): CarrierFigures {
  return { id: 'bank-1', label: 'Compte', kind: 'bank', detail: null, managerName: null, openingBalanceCents: 100000, incomeCents: 0, archivedAt: null, ...overrides }
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e-1',
    seasonId: 's-1',
    categoryId: 'cat-1',
    amountCents: 1000,
    label: 'Dépense',
    spentOn: '2026-10-01',
    payer: { kind: 'carrier', carrierId: 'bank-1', paymentMethod: 'card' },
    recordedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  }
}

const categories: ExpenseCategory[] = [
  { id: 'cat-1', label: 'Équipement', colorIndex: 0 },
  { id: 'cat-2', label: 'Buvette', colorIndex: 1 },
  { id: 'cat-3', label: 'Déplacements', colorIndex: 2 },
]

function snapshot(overrides: Partial<FinancesSnapshot> = {}): FinancesSnapshot {
  return {
    season: { id: 's-1', label: '2026-2027', startDate: '2026-09-01', endDate: '2027-06-30' },
    carriers: [],
    unattributedIncomeCents: 0,
    categories,
    usedCategoryIds: [],
    expenses: [],
    checkpoints: [],
    outstandingAdvances: [],
    advanceMembers: [],
    advanceCandidates: [],
    ...overrides,
  }
}

describe('theoreticalBalanceCents', () => {
  it('is opening balance + attributed income - the carrier expenses', () => {
    const result = theoreticalBalanceCents(carrier({ openingBalanceCents: 100000, incomeCents: 25000 }), [
      expense({ amountCents: 3000 }),
      expense({ id: 'e-2', amountCents: 500 }),
    ])
    expect(result).toBe(121500)
  })

  it('treats a missing opening balance as 0', () => {
    expect(theoreticalBalanceCents(carrier({ openingBalanceCents: null, incomeCents: 2000 }), [])).toBe(2000)
  })

  it("ignores another carrier's expenses", () => {
    expect(theoreticalBalanceCents(carrier(), [expense({ payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'card' }, amountCents: 9999 })])).toBe(100000)
  })

  // specs/finances-member-advances.md PO-FA-18/AC-FA-08.
  it('ignores an advance by a member, reimbursed or not', () => {
    const toReimburse = expense({ id: 'a-1', amountCents: 5800, payer: { kind: 'member', userId: 'member-1', reimbursement: null } })
    const reimbursed = expense({
      id: 'a-2',
      amountCents: 4200,
      payer: { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-03', paymentMethod: 'cash' } },
    })
    expect(theoreticalBalanceCents(carrier(), [toReimburse, reimbursed])).toBe(100000)
  })

  it('can be negative', () => {
    expect(theoreticalBalanceCents(carrier({ openingBalanceCents: 0 }), [expense({ amountCents: 1 })])).toBe(-1)
  })
})

describe('varianceCents / isJust', () => {
  it.each([
    [1000, 1000, 0],
    [1250, 1000, 250],
    [900, 1000, -100],
    [1001, 1000, 1],
  ])('counted %i vs theoretical %i = %i', (counted, theoretical, expected) => {
    expect(varianceCents(counted, theoretical)).toBe(expected)
  })

  it('is "Juste" iff the variance is exactly zero', () => {
    expect(isJust(0)).toBe(true)
    expect(isJust(1)).toBe(false)
    expect(isJust(-1)).toBe(false)
  })
})

describe('summarizeTreasury', () => {
  const bank = carrier({ id: 'bank-1', kind: 'bank', openingBalanceCents: 100000, incomeCents: 20000 })
  const cash = carrier({ id: 'cash-1', kind: 'cash', openingBalanceCents: null, incomeCents: 5000 })

  it('sums the carriers into available, split by kind (the kinds sum to the total)', () => {
    const summary = summarizeTreasury(snapshot({ carriers: [bank, cash], expenses: [expense({ amountCents: 4000 })] }))
    expect(summary.availableByKind).toEqual({ bank: 116000, cash: 5000 })
    expect(summary.availableCents).toBe(121000)
    expect(summary.availableByKind.bank + summary.availableByKind.cash).toBe(summary.availableCents)
  })

  it('counts ALL season income, attributed or not, but only attributed income in balances', () => {
    const summary = summarizeTreasury(snapshot({ carriers: [bank, cash], unattributedIncomeCents: 7000 }))
    expect(summary.incomeCents).toBe(32000)
    expect(summary.unattributedIncomeCents).toBe(7000)
    expect(summary.availableCents).toBe(100000 + 20000 + 5000)
  })

  it('sets expenses to the season expense total', () => {
    const summary = summarizeTreasury(snapshot({ carriers: [bank], expenses: [expense({ amountCents: 1500 }), expense({ id: 'e-2', amountCents: 500 })] }))
    expect(summary.expensesCents).toBe(2000)
  })

  it('flags a carrier without an opening balance and exposes its last count', () => {
    const checkpoint: TreasuryCheckpoint = {
      id: 'c-1',
      checkedOn: '2026-09-15',
      recordedAt: '2026-09-15T10:00:00.000Z',
      lines: [{ carrierId: 'bank-1', countedCents: 479000, theoreticalCents: 400000 }],
    }
    const summary = summarizeTreasury(snapshot({ carriers: [bank, cash], checkpoints: [checkpoint] }))
    expect(summary.carriers[0].openingMissing).toBe(false)
    expect(summary.carriers[0].lastCount).toEqual({ checkedOn: '2026-09-15', countedCents: 479000 })
    expect(summary.carriers[1].openingMissing).toBe(true)
    expect(summary.carriers[1].lastCount).toBeUndefined()
  })

  it('is all zero without carriers', () => {
    expect(summarizeTreasury(snapshot()).availableCents).toBe(0)
  })
})

describe('checkpoints', () => {
  const older: TreasuryCheckpoint = {
    id: 'c-1',
    checkedOn: '2026-09-15',
    recordedAt: '2026-09-15T10:00:00.000Z',
    lines: [
      { carrierId: 'bank-1', countedCents: 479000, theoreticalCents: 470000 },
      { carrierId: 'cash-1', countedCents: 1000, theoreticalCents: 1500 },
    ],
  }
  const newer: TreasuryCheckpoint = {
    id: 'c-2',
    checkedOn: '2026-10-01',
    recordedAt: '2026-10-01T10:00:00.000Z',
    lines: [{ carrierId: 'bank-1', countedCents: 450000, theoreticalCents: 450000 }],
  }

  it('totals the frozen variance of a point', () => {
    expect(checkpointTotalVarianceCents(older)).toBe(9000 - 500)
    expect(checkpointTotalVarianceCents(newer)).toBe(0)
  })

  it('sorts newest first, by checked date then entry time', () => {
    const sameDayLater = { ...older, id: 'c-3', recordedAt: '2026-09-15T18:00:00.000Z' }
    expect(sortCheckpoints([older, newer, sameDayLater]).map((c) => c.id)).toEqual(['c-2', 'c-3', 'c-1'])
  })

  it('returns the LAST point that counted a carrier', () => {
    expect(lastCountForCarrier([older, newer], 'bank-1')).toEqual({ checkedOn: '2026-10-01', countedCents: 450000 })
    expect(lastCountForCarrier([older, newer], 'cash-1')).toEqual({ checkedOn: '2026-09-15', countedCents: 1000 })
  })

  it('returns undefined for a carrier never counted', () => {
    expect(lastCountForCarrier([older], 'other')).toBeUndefined()
  })
})

describe('expense totals', () => {
  const expenses = [
    expense({ id: 'e-1', categoryId: 'cat-1', amountCents: 3800 }),
    expense({ id: 'e-2', categoryId: 'cat-2', amountCents: 6800 }),
    expense({ id: 'e-3', categoryId: 'cat-1', amountCents: 200 }),
  ]

  it('groups by category, biggest first, omitting categories without expense', () => {
    const totals = expenseTotalsByCategory(expenses, categories)
    expect(totals.map((t) => [t.category.id, t.totalCents])).toEqual([
      ['cat-2', 6800],
      ['cat-1', 4000],
    ])
  })

  it('has a breakdown summing to the season total', () => {
    const sum = expenseTotalsByCategory(expenses, categories).reduce((total, t) => total + t.totalCents, 0)
    expect(sum).toBe(sumExpensesCents(expenses))
  })

  it('sums an empty list to 0', () => {
    expect(sumExpensesCents([])).toBe(0)
    expect(expenseTotalsByCategory([], categories)).toEqual([])
  })
})

describe('monthExpensesCents', () => {
  const expenses = [
    expense({ id: 'e-1', spentOn: '2026-10-04', amountCents: 3800 }),
    expense({ id: 'e-2', spentOn: '2026-10-02', amountCents: 9500 }),
    expense({ id: 'e-3', spentOn: '2026-09-30', amountCents: 6000 }),
    expense({ id: 'e-4', spentOn: '2025-10-15', amountCents: 100 }),
  ]

  it('sums the calendar month of `today` only', () => {
    expect(monthExpensesCents(expenses, '2026-10-06')).toBe(13300)
  })

  it('counts an expense on the first and the last day of the month', () => {
    expect(monthExpensesCents([expense({ spentOn: '2026-10-01', amountCents: 1 }), expense({ id: 'x', spentOn: '2026-10-31', amountCents: 2 })], '2026-10-15')).toBe(3)
  })
})

describe('sortExpenses / filter / chips', () => {
  const a = expense({ id: 'a', spentOn: '2026-10-02', recordedAt: '2026-10-02T08:00:00.000Z', categoryId: 'cat-1' })
  const b = expense({ id: 'b', spentOn: '2026-10-04', recordedAt: '2026-10-04T08:00:00.000Z', categoryId: 'cat-2' })
  const c = expense({ id: 'c', spentOn: '2026-10-04', recordedAt: '2026-10-04T09:00:00.000Z', categoryId: 'cat-2' })

  it('sorts newest first: expense date, then entry time', () => {
    expect(sortExpenses([a, b, c]).map((e) => e.id)).toEqual(['c', 'b', 'a'])
  })

  it('does not mutate its input', () => {
    const input = [a, b]
    sortExpenses(input)
    expect(input.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('"Toutes" (null) keeps everything, a category restricts', () => {
    expect(filterExpensesByCategory([a, b, c], null)).toHaveLength(3)
    expect(filterExpensesByCategory([a, b, c], 'cat-2').map((e) => e.id)).toEqual(['b', 'c'])
  })

  it('offers chips only for categories with at least one expense', () => {
    expect(categoriesWithExpenses([a, b], categories).map((cat) => cat.id)).toEqual(['cat-1', 'cat-2'])
  })
})

// specs/finances-member-advances.md AC-FA-07/AC-FA-08/AC-FA-10.
describe('advances in the totals', () => {
  const advance = expense({ id: 'a-1', categoryId: 'cat-2', amountCents: 5800, spentOn: '2026-10-05', payer: { kind: 'member', userId: 'member-1', reimbursement: null } })
  const paid = expense({ id: 'e-1', categoryId: 'cat-1', amountCents: 3800, spentOn: '2026-10-04' })

  it('counts an advance in the season total, the month, the breakdown and the filter', () => {
    expect(sumExpensesCents([advance, paid])).toBe(9600)
    expect(monthExpensesCents([advance, paid], '2026-10-06')).toBe(9600)
    expect(expenseTotalsByCategory([advance, paid], categories).map((t) => [t.category.id, t.totalCents])).toEqual([
      ['cat-2', 5800],
      ['cat-1', 3800],
    ])
    expect(filterExpensesByCategory([advance, paid], 'cat-2').map((e) => e.id)).toEqual(['a-1'])
  })

  it('leaves the available balance and the carrier balances untouched', () => {
    const summary = summarizeTreasury(snapshot({ carriers: [carrier({ openingBalanceCents: 100000 })], expenses: [advance, paid] }))
    expect(summary.carriers[0].theoreticalCents).toBe(100000 - 3800)
    expect(summary.availableCents).toBe(100000 - 3800)
    expect(summary.expensesCents).toBe(9600)
  })
})

describe('amountsOwedToMembers', () => {
  const advance = (overrides: Partial<OutstandingAdvance>): OutstandingAdvance => ({
    id: 'a-1',
    advancedByUserId: 'member-1',
    amountCents: 1000,
    label: 'Achat',
    spentOn: '2026-10-01',
    seasonLabel: '2026-2027',
    ...overrides,
  })
  const members = [
    { userId: 'member-1', displayName: 'Compte B' },
    { userId: 'member-2', displayName: 'Compte A' },
    { userId: 'member-3', displayName: 'Compte C' },
  ]

  it('is empty, total 0, when nothing is owed', () => {
    expect(amountsOwedToMembers([], members)).toEqual({ members: [], totalCents: 0 })
  })

  it('sums per member across seasons, biggest first, then by name, with the grand total', () => {
    const result = amountsOwedToMembers(
      [
        advance({ id: 'a-1', advancedByUserId: 'member-1', amountCents: 5800, seasonLabel: '2025-2026' }),
        advance({ id: 'a-2', advancedByUserId: 'member-1', amountCents: 4200, spentOn: '2026-10-04' }),
        advance({ id: 'a-3', advancedByUserId: 'member-2', amountCents: 10000 }),
        advance({ id: 'a-4', advancedByUserId: 'member-3', amountCents: 2000 }),
      ],
      members,
    )
    expect(result.members.map((m) => [m.displayName, m.owedCents])).toEqual([
      ['Compte A', 10000],
      ['Compte B', 10000],
      ['Compte C', 2000],
    ])
    expect(result.totalCents).toBe(22000)
  })

  it('lists the advances of a member newest first', () => {
    const result = amountsOwedToMembers(
      [advance({ id: 'old', spentOn: '2026-09-02' }), advance({ id: 'new', spentOn: '2026-10-04' })],
      members,
    )
    expect(result.members[0].advances.map((a) => a.id)).toEqual(['new', 'old'])
  })

  it('does not mutate its inputs', () => {
    const outstanding = [advance({ id: 'old', spentOn: '2026-09-02' }), advance({ id: 'new', spentOn: '2026-10-04' })]
    amountsOwedToMembers(outstanding, members)
    expect(outstanding.map((a) => a.id)).toEqual(['old', 'new'])
  })
})

// specs/finances-member-advances.md §2.6/PO-FA-14.
describe('archived carriers', () => {
  const archived = carrier({ id: 'old-1', archivedAt: '2026-09-30T10:00:00.000Z', openingBalanceCents: 0 })

  it('tells archived from active, and filters the active ones', () => {
    expect(isCarrierArchived(archived)).toBe(true)
    expect(isCarrierArchived(carrier())).toBe(false)
    expect(activeCarriers([carrier(), archived]).map((c) => c.id)).toEqual(['bank-1'])
  })

  it('lists an archived carrier in the treasury only with activity in the season', () => {
    expect(isCarrierListedInTreasury(archived, [])).toBe(false)
    expect(isCarrierListedInTreasury({ ...archived, incomeCents: 2000 }, [])).toBe(true)
    expect(isCarrierListedInTreasury(archived, [expense({ payer: { kind: 'carrier', carrierId: 'old-1', paymentMethod: 'cash' } })])).toBe(true)
    // An advance by a member is NOT carrier activity.
    expect(isCarrierListedInTreasury(archived, [expense({ payer: { kind: 'member', userId: 'member-1', reimbursement: null } })])).toBe(false)
    expect(isCarrierListedInTreasury(carrier(), [])).toBe(true)
  })

  it('contributes 0 to the available balance and is omitted from "Par porteur" without activity', () => {
    const summary = summarizeTreasury(snapshot({ carriers: [carrier({ openingBalanceCents: 1000 }), archived] }))
    expect(summary.carriers.map((entry) => entry.carrier.id)).toEqual(['bank-1'])
    expect(summary.availableCents).toBe(1000)
  })
})
