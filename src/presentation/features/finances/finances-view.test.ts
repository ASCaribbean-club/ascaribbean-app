import { describe, expect, it } from 'vitest'
import type { FinancesSnapshot } from '@domain/entities/finance'
import { EXPENSES_PAGE_SIZE, toExpensesTabView, toOwedBlockView, toTreasuryTabView } from './finances-view'

const plain = (text: string) => text.replace(/[\u202f\u00a0]/g, ' ')

function snapshot(overrides: Partial<FinancesSnapshot> = {}): FinancesSnapshot {
  return {
    season: { id: 's-1', label: '2026-2027', startDate: '2026-09-01', endDate: '2027-06-30' },
    carriers: [
      { id: 'bank-1', label: 'Compte', kind: 'bank', detail: 'Établissement · Courant', managerName: null, archivedAt: null, openingBalanceCents: 100000, incomeCents: 50000 },
      { id: 'cash-1', label: 'Caisse', kind: 'cash', detail: null, managerName: 'Responsable', archivedAt: null, openingBalanceCents: null, incomeCents: 0 },
    ],
    unattributedIncomeCents: 0,
    categories: [
      { id: 'cat-1', label: 'Équipement', colorIndex: 0 },
      { id: 'cat-2', label: 'Buvette', colorIndex: 1 },
      { id: 'cat-3', label: 'Déplacements', colorIndex: 2 },
    ],
    usedCategoryIds: ['cat-1', 'cat-2'],
    expenses: [
      { id: 'e-1', seasonId: 's-1', categoryId: 'cat-1', amountCents: 3800, label: 'Trousse', spentOn: '2026-10-04', payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' }, recordedAt: '2026-10-04T10:00:00.000Z' },
      { id: 'e-2', seasonId: 's-1', categoryId: 'cat-2', amountCents: 6800, label: 'Boissons', spentOn: '2026-09-21', payer: { kind: 'carrier', carrierId: 'bank-1', paymentMethod: 'transfer' }, recordedAt: '2026-09-21T10:00:00.000Z' },
    ],
    checkpoints: [],
    outstandingAdvances: [],
    advanceMembers: [],
    advanceCandidates: [],
    ...overrides,
  }
}

const params = { categoryFilterId: null, visibleCount: EXPENSES_PAGE_SIZE, today: '2026-10-06' }

describe('toExpensesTabView', () => {
  it('builds the summary: season total, this month, breakdown summing to the total', () => {
    const view = toExpensesTabView(snapshot(), params)
    expect(plain(view.totalLabel)).toBe('106 €')
    expect(plain(view.monthLabel)).toBe('38 €')
    expect(view.segments.map((s) => s.label)).toEqual(['Buvette', 'Équipement'])
    expect(view.segments.reduce((total, s) => total + s.percent, 0)).toBeCloseTo(100)
  })

  it('filters the list and its counter but NOT the summary card', () => {
    const view = toExpensesTabView(snapshot(), { ...params, categoryFilterId: 'cat-1' })
    expect(view.lines.map((l) => l.id)).toEqual(['e-1'])
    expect(view.countLabel).toBe('1 dépense')
    expect(plain(view.totalLabel)).toBe('106 €')
    expect(view.segments).toHaveLength(2)
  })

  it('uses singular and plural in the counter', () => {
    expect(toExpensesTabView(snapshot(), params).countLabel).toBe('2 dépenses')
  })

  it('offers "Toutes" first, then only categories having an expense', () => {
    expect(toExpensesTabView(snapshot(), params).filters).toEqual([
      { id: null, label: 'Toutes' },
      { id: 'cat-1', label: 'Équipement' },
      { id: 'cat-2', label: 'Buvette' },
    ])
  })

  it('writes each line with category, short date, method, negative amount and carrier', () => {
    const [line] = toExpensesTabView(snapshot(), params).lines
    expect(line.label).toBe('Trousse')
    expect(line.meta).toBe('Équipement · 4 oct. · Espèces')
    expect(plain(line.amountLabel)).toBe('−38 €')
    expect(line.payerLabel).toBe('Caisse')
    expect(line.stateLabel).toBeNull()
  })

  it('paginates the list by page size while the counter stays the filtered total', () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      id: `e-${index}`,
      seasonId: 's-1',
      categoryId: 'cat-1',
      amountCents: 100,
      label: `Dépense ${index}`,
      spentOn: '2026-10-01',
      payer: { kind: 'carrier' as const, carrierId: 'bank-1', paymentMethod: 'card' as const },
      recordedAt: `2026-10-01T10:${String(index).padStart(2, '0')}:00.000Z`,
    }))
    const view = toExpensesTabView(snapshot({ expenses: many }), params)
    expect(view.lines).toHaveLength(EXPENSES_PAGE_SIZE)
    expect(view.countLabel).toBe('25 dépenses')
    expect(view.hasMore).toBe(true)
    expect(toExpensesTabView(snapshot({ expenses: many }), { ...params, visibleCount: 40 }).hasMore).toBe(false)
  })

  it('reports an empty season', () => {
    const view = toExpensesTabView(snapshot({ expenses: [] }), params)
    expect(view.hasExpenses).toBe(false)
    expect(plain(view.totalLabel)).toBe('0 €')
    expect(view.segments).toEqual([])
    expect(view.filters).toEqual([{ id: null, label: 'Toutes' }])
  })
})

describe('toTreasuryTabView', () => {
  it('computes available with the banque / espèces breakdown', () => {
    const view = toTreasuryTabView(snapshot())
    // bank: 1000 + 500 - 68 ; cash: 0 + 0 - 38
    expect(plain(view.bankLabel)).toBe('1 432 €')
    expect(plain(view.cashLabel)).toBe('−38 €')
    expect(plain(view.availableLabel)).toBe('1 394 €')
    expect(view.isAvailableNegative).toBe(false)
    expect(plain(view.expensesLabel)).toBe('106 €')
    expect(plain(view.incomeLabel)).toBe('500 €')
  })

  it('shows the unattributed-income mention only when above zero', () => {
    expect(toTreasuryTabView(snapshot()).unattributedLabel).toBeNull()
    const view = toTreasuryTabView(snapshot({ unattributedIncomeCents: 12000 }))
    expect(plain(view.unattributedLabel ?? '')).toBe('120 € d\'entrées sans porteur')
    expect(plain(view.incomeLabel)).toBe('620 €')
  })

  it('describes carriers, flags a missing opening balance, and builds the details', () => {
    const [bank, cash] = toTreasuryTabView(snapshot()).carriers
    expect(bank.badge).toBe('BQ')
    expect(bank.detail).toBe('Établissement · Courant')
    expect(bank.openingMissing).toBe(false)
    expect(cash.badge).toBe('€')
    expect(cash.detail).toBe('Espèces · Responsable')
    expect(cash.openingMissing).toBe(true)
    expect(cash.isBalanceNegative).toBe(true)
  })

  it('shows "Ouverture {montant}" once entered (every role) and never together with the "non saisi" mention', () => {
    const [bank, cash] = toTreasuryTabView(snapshot()).carriers
    expect(plain(bank.openingLabel ?? '')).toBe('Ouverture 1 000 €')
    expect(bank.openingMissing).toBe(false)
    expect(cash.openingLabel).toBeNull()
    expect(cash.openingMissing).toBe(true)
  })

  it('shows "Compté {date}" from the last point only, nothing when never counted', () => {
    const view = toTreasuryTabView(
      snapshot({
        checkpoints: [
          { id: 'c-1', checkedOn: '2026-09-15', recordedAt: '2026-09-15T10:00:00.000Z', lines: [{ carrierId: 'bank-1', countedCents: 479000, theoreticalCents: 470000 }] },
        ],
      }),
    )
    expect(plain(view.carriers[0].lastCountLabel ?? '')).toBe('Compté 15 sept. : 4 790 €')
    expect(view.carriers[1].lastCountLabel).toBeNull()
  })

  it('lists points newest first with a signed, frozen variance or "Juste"', () => {
    const view = toTreasuryTabView(
      snapshot({
        checkpoints: [
          { id: 'c-1', checkedOn: '2026-09-15', recordedAt: 'a', lines: [{ carrierId: 'bank-1', countedCents: 1000, theoreticalCents: 1000 }] },
          { id: 'c-2', checkedOn: '2026-10-01', recordedAt: 'b', lines: [{ carrierId: 'bank-1', countedCents: 900, theoreticalCents: 1000 }] },
        ],
      }),
    )
    expect(view.checkpoints.map((c) => c.id)).toEqual(['c-2', 'c-1'])
    expect(plain(view.checkpoints[0].varianceLabel)).toBe('Écart −1 €')
    expect(view.checkpoints[1].varianceLabel).toBe('Juste')
    expect(view.checkpoints[1].isJust).toBe(true)
  })

  it('reports having no carrier', () => {
    expect(toTreasuryTabView(snapshot({ carriers: [] })).hasCarriers).toBe(false)
  })
})

// specs/finances-member-advances.md A5/A6/A7.
describe('advances in the views', () => {
  const advance = (overrides: Record<string, unknown> = {}) => ({
    id: 'a-1',
    seasonId: 's-1',
    categoryId: 'cat-2',
    amountCents: 5800,
    label: 'Maillots',
    spentOn: '2026-10-05',
    payer: { kind: 'member' as const, userId: 'member-1', reimbursement: null },
    recordedAt: '2026-10-05T10:00:00.000Z',
    ...overrides,
  })
  const members = [{ userId: 'member-1', displayName: 'Compte A' }]

  it('writes an advance to reimburse with "Avancé par", the state in text and NO method', () => {
    const [line] = toExpensesTabView(snapshot({ expenses: [advance()], advanceMembers: members }), params).lines
    expect(line.payerLabel).toBe('Avancé par Compte A')
    expect(line.stateLabel).toBe('À rembourser')
    expect(line.stateTone).toBe('to-reimburse')
    expect(line.meta).toBe('Buvette · 5 oct.')
    expect(line.isLocked).toBe(false)
  })

  it('writes a reimbursed advance with its date and the method of the reimbursement', () => {
    const reimbursed = advance({ payer: { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-06', paymentMethod: 'transfer' } } })
    const [line] = toExpensesTabView(snapshot({ expenses: [reimbursed], advanceMembers: members }), params).lines
    expect(line.stateLabel).toBe('Remboursé le 6 oct.')
    expect(line.stateTone).toBe('reimbursed')
    expect(line.meta).toBe('Buvette · 5 oct. · Virement')
  })

  it('counts an advance in the season total but not in any carrier balance', () => {
    const view = toExpensesTabView(snapshot({ expenses: [advance()], advanceMembers: members }), params)
    expect(plain(view.totalLabel)).toBe('58 €')
    expect(plain(toTreasuryTabView(snapshot({ expenses: [advance()], advanceMembers: members })).availableLabel)).toBe('1 500 €')
  })

  it('locks the line of an expense paid from an archived carrier', () => {
    const archived = snapshot().carriers.map((carrier) => (carrier.id === 'cash-1' ? { ...carrier, archivedAt: '2026-09-30T10:00:00.000Z' } : carrier))
    const lines = toExpensesTabView(snapshot({ carriers: archived }), params).lines
    expect(lines.find((line) => line.id === 'e-1')?.isLocked).toBe(true)
    expect(lines.find((line) => line.id === 'e-2')?.isLocked).toBe(false)
    expect(lines.find((line) => line.id === 'e-1')?.payerLabel).toBe('Caisse')
  })

  it('marks an archived carrier with activity "Archivé" and omits one without', () => {
    const base = snapshot().carriers[0]
    const withActivity = { ...base, id: 'old-1', label: 'Ancienne', archivedAt: '2026-09-30T10:00:00.000Z', openingBalanceCents: 0, incomeCents: 2000 }
    const withoutActivity = { ...withActivity, id: 'old-2', label: 'Vide', incomeCents: 0 }
    const view = toTreasuryTabView(snapshot({ carriers: [base, withActivity, withoutActivity] }))
    expect(view.carriers.map((carrier) => carrier.id)).toEqual(['bank-1', 'old-1'])
    const archived = view.carriers[1]
    expect(archived.isArchived).toBe(true)
    expect(archived.openingMissing).toBe(false)
    expect(archived.openingLabel).toBeNull()
  })

  it('builds the "À rembourser" block: per member, biggest first, total, season always named', () => {
    const view = toOwedBlockView(
      snapshot({
        advanceMembers: [
          { userId: 'member-1', displayName: 'Compte A' },
          { userId: 'member-2', displayName: 'Compte B' },
        ],
        outstandingAdvances: [
          { id: 'a-1', advancedByUserId: 'member-1', amountCents: 5800, label: 'Maillots', spentOn: '2026-10-02', seasonLabel: '2026-2027' },
          { id: 'a-2', advancedByUserId: 'member-2', amountCents: 10000, label: 'Ballons', spentOn: '2026-05-02', seasonLabel: '2025-2026' },
        ],
      }),
    )
    expect(view?.members.map((member) => member.name)).toEqual(['Compte B', 'Compte A'])
    expect(plain(view?.totalLabel ?? '')).toBe('158 €')
    expect(plain(view?.totalAriaLabel ?? '')).toBe('Total à rembourser : 158 €')
    expect(view?.members[0].advances[0].detail).toBe('2 mai · Saison 2025-2026')
  })

  it('has no block at all when nothing is owed', () => {
    expect(toOwedBlockView(snapshot())).toBeNull()
  })
})
