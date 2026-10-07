import { describe, expect, it } from 'vitest'
import type { FinanceExpenseDto, FinancesSnapshotDto } from '../dto/finances-dto'
import {
  toCarrierOption,
  toExpense,
  toExpenseCategory,
  toCheckpointDetail,
  toExpenseInsertRow,
  toExpenseUpdateRow,
  toFinancesSnapshot,
  toOpeningBalance,
  toOpeningBalanceInsertRow,
  toRecordedCheckpoint,
} from './finances-mapper'

// specs/finances-member-advances.md AC-FA-24 — the three payer shapes.
const carrierExpense: FinanceExpenseDto = {
  id: 'e',
  season_id: 's-1',
  category_id: 'cat-1',
  carrier_id: 'cash-1',
  advanced_by_user_id: null,
  reimbursed_on: null,
  amount_cents: 3800,
  label: 'Trousse',
  spent_on: '2026-10-04',
  payment_method: 'cash',
  recorded_at: '2026-10-04T10:00:00.000Z',
}
const advanceToReimburse: FinanceExpenseDto = {
  ...carrierExpense,
  carrier_id: null,
  advanced_by_user_id: 'member-1',
  amount_cents: 5800,
  payment_method: null,
}
const advanceReimbursed: FinanceExpenseDto = {
  ...advanceToReimburse,
  reimbursed_on: '2026-10-05',
  payment_method: 'transfer',
}

describe('toFinancesSnapshot', () => {
  const dto: FinancesSnapshotDto = {
    season: { id: 's-1', label: '2026-2027', start_date: '2026-09-01', end_date: '2027-06-30' },
    carriers: [
      { id: 'bank-1', label: 'Compte', kind: 'bank', detail: 'Banque · Courant', manager_name: null, archived_at: null, opening_balance_cents: 100000, income_cents: 5000 },
      { id: 'cash-1', label: 'Caisse', kind: 'cash', detail: null, manager_name: 'Responsable', archived_at: '2026-09-30T10:00:00.000Z', opening_balance_cents: null, income_cents: null },
    ],
    unattributed_income_cents: 2500,
    categories: [{ id: 'cat-1', label: 'Équipement', color_index: 2 }],
    used_category_ids: ['cat-1'],
    expenses: [
      { ...carrierExpense, id: 'e-1' },
      { ...advanceToReimburse, id: 'e-2' },
      { ...advanceReimbursed, id: 'e-3' },
    ],
    outstanding_advances: [
      { id: 'e-2', advanced_by_user_id: 'member-1', amount_cents: 5800, label: 'Maillots', spent_on: '2026-10-02', season_label: '2026-2027' },
    ],
    advance_members: [{ user_id: 'member-1', display_name: 'Compte A' }],
    advance_candidates: [
      { user_id: 'member-1', display_name: 'Compte A' },
      { user_id: 'member-2', display_name: 'Compte B' },
    ],
    checkpoints: [
      {
        id: 'c-1',
        checked_on: '2026-09-15',
        recorded_at: '2026-09-15T10:00:00.000Z',
        lines: [{ carrier_id: 'bank-1', counted_cents: 479000, theoretical_cents: 470000 }],
      },
    ],
  }

  it('maps every section to camelCase entities', () => {
    const snapshot = toFinancesSnapshot(dto)

    expect(snapshot.season).toEqual({ id: 's-1', label: '2026-2027', startDate: '2026-09-01', endDate: '2027-06-30' })
    expect(snapshot.carriers[0]).toEqual({
      id: 'bank-1',
      label: 'Compte',
      kind: 'bank',
      detail: 'Banque · Courant',
      managerName: null,
      archivedAt: null,
      openingBalanceCents: 100000,
      incomeCents: 5000,
    })
    expect(snapshot.carriers[1].archivedAt).toBe('2026-09-30T10:00:00.000Z')
    expect(snapshot.unattributedIncomeCents).toBe(2500)
    expect(snapshot.usedCategoryIds).toEqual(['cat-1'])
    expect(snapshot.categories).toEqual([{ id: 'cat-1', label: 'Équipement', colorIndex: 2 }])
    expect(snapshot.expenses[0]).toMatchObject({
      seasonId: 's-1',
      categoryId: 'cat-1',
      amountCents: 3800,
      spentOn: '2026-10-04',
      payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' },
    })
    expect(snapshot.outstandingAdvances).toEqual([
      { id: 'e-2', advancedByUserId: 'member-1', amountCents: 5800, label: 'Maillots', spentOn: '2026-10-02', seasonLabel: '2026-2027' },
    ])
    expect(snapshot.advanceMembers).toEqual([{ userId: 'member-1', displayName: 'Compte A' }])
    expect(snapshot.advanceCandidates.map((account) => account.userId)).toEqual(['member-1', 'member-2'])
    expect(snapshot.checkpoints[0].lines).toEqual([{ carrierId: 'bank-1', countedCents: 479000, theoreticalCents: 470000 }])
  })

  it('keeps a missing opening balance as null (never 0) and null income as 0', () => {
    const snapshot = toFinancesSnapshot(dto)
    expect(snapshot.carriers[1].openingBalanceCents).toBeNull()
    expect(snapshot.carriers[1].incomeCents).toBe(0)
    expect(snapshot.carriers[1].managerName).toBe('Responsable')
  })

  it('maps "no current season" and tolerates null arrays', () => {
    const snapshot = toFinancesSnapshot({
      season: null,
      carriers: null,
      unattributed_income_cents: null,
      categories: null,
      used_category_ids: null,
      expenses: null,
      checkpoints: null,
      outstanding_advances: null,
      advance_members: null,
      advance_candidates: null,
    })
    expect(snapshot).toEqual({
      season: null,
      carriers: [],
      unattributedIncomeCents: 0,
      categories: [],
      usedCategoryIds: [],
      expenses: [],
      checkpoints: [],
      outstandingAdvances: [],
      advanceMembers: [],
      advanceCandidates: [],
    })
  })

  it('tolerates a checkpoint with null lines', () => {
    const snapshot = toFinancesSnapshot({ ...dto, checkpoints: [{ id: 'c', checked_on: '2026-09-15', recorded_at: 'x', lines: null }] })
    expect(snapshot.checkpoints[0].lines).toEqual([])
  })
})

describe('toExpense — payer', () => {
  it('maps a carrier expense', () => {
    expect(toExpense(carrierExpense).payer).toEqual({ kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' })
  })

  it('maps an advance to reimburse: no reimbursement, no method', () => {
    expect(toExpense(advanceToReimburse).payer).toEqual({ kind: 'member', userId: 'member-1', reimbursement: null })
  })

  it('maps a reimbursed advance with its date and the method of the reimbursement', () => {
    expect(toExpense(advanceReimbursed).payer).toEqual({
      kind: 'member',
      userId: 'member-1',
      reimbursement: { reimbursedOn: '2026-10-05', paymentMethod: 'transfer' },
    })
  })

  it('refuses a row with no payer instead of guessing one', () => {
    expect(() => toExpense({ ...carrierExpense, carrier_id: null })).toThrow()
  })
})

describe('enum fallbacks', () => {
  it('reads an unknown carrier kind as a bank and an unknown method as card', () => {
    expect(toCarrierOption({ id: 'x', label: 'X', kind: 'weird' }).kind).toBe('bank')
    expect(toCarrierOption({ id: 'x', label: 'X', kind: 'cash' }).kind).toBe('cash')
    expect(
      toExpense({ ...carrierExpense, payment_method: 'weird' }).payer,
    ).toMatchObject({ paymentMethod: 'card' })
  })

  it('maps the five expense methods through unchanged', () => {
    for (const method of ['card', 'transfer', 'cash', 'cheque', 'direct_debit']) {
      expect(
        toExpense({ ...carrierExpense, payment_method: method }).payer,
      ).toMatchObject({ paymentMethod: method })
    }
  })
})

describe('insert rows', () => {
  it('maps an expense input to its columns, with no id or recorded_at', () => {
    const row = toExpenseInsertRow({
      seasonId: 's-1',
      amountCents: 3800,
      label: 'Trousse',
      spentOn: '2026-10-04',
      categoryId: 'cat-1',
      payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'direct_debit' },
      recordedBy: 'actor-1',
    })
    expect(row).toEqual({
      season_id: 's-1',
      category_id: 'cat-1',
      carrier_id: 'cash-1',
      advanced_by_user_id: null,
      reimbursed_on: null,
      amount_cents: 3800,
      label: 'Trousse',
      spent_on: '2026-10-04',
      payment_method: 'direct_debit',
      recorded_by: 'actor-1',
    })
    expect(row).not.toHaveProperty('id')
    expect(row).not.toHaveProperty('recorded_at')
  })

  it('maps an advance to reimburse: no carrier, no method, no date', () => {
    expect(
      toExpenseInsertRow({
        seasonId: 's-1',
        amountCents: 5800,
        label: 'Maillots',
        spentOn: '2026-10-02',
        categoryId: 'cat-1',
        payer: { kind: 'member', userId: 'member-1', reimbursement: null },
        recordedBy: 'actor-1',
      }),
    ).toMatchObject({ carrier_id: null, advanced_by_user_id: 'member-1', reimbursed_on: null, payment_method: null })
  })

  it('maps a reimbursed advance with its date and method', () => {
    expect(
      toExpenseInsertRow({
        seasonId: 's-1',
        amountCents: 5800,
        label: 'Maillots',
        spentOn: '2026-10-02',
        categoryId: 'cat-1',
        payer: { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-05', paymentMethod: 'cash' } },
        recordedBy: 'actor-1',
      }),
    ).toMatchObject({ carrier_id: null, advanced_by_user_id: 'member-1', reimbursed_on: '2026-10-05', payment_method: 'cash' })
  })

  it('maps an opening balance in both directions', () => {
    expect(toOpeningBalanceInsertRow({ carrierId: 'b', seasonId: 's', amountCents: 0, recordedBy: 'a' })).toEqual({
      carrier_id: 'b',
      season_id: 's',
      amount_cents: 0,
      recorded_by: 'a',
    })
    expect(toOpeningBalance({ id: 'ob', carrier_id: 'b', season_id: 's', amount_cents: 100 })).toEqual({
      id: 'ob',
      carrierId: 'b',
      seasonId: 's',
      amountCents: 100,
    })
  })

  it('maps a category row and the checkpoint result (bigint as string tolerated)', () => {
    expect(toExpenseCategory({ id: 'c', label: 'L', color_index: 3 })).toEqual({ id: 'c', label: 'L', colorIndex: 3 })
    expect(toRecordedCheckpoint({ id: 'cp', total_variance_cents: -500 })).toEqual({ id: 'cp', totalVarianceCents: -500 })
    expect(toRecordedCheckpoint({ id: 'cp', total_variance_cents: '250' as unknown as number }).totalVarianceCents).toBe(250)
  })
})

describe('toExpenseUpdateRow', () => {
  it('carries exactly the writable columns, never author, timestamp or season', () => {
    const row = toExpenseUpdateRow({
      amountCents: 4200,
      label: 'Trousse',
      spentOn: '2026-10-05',
      categoryId: 'cat-2',
      payer: { kind: 'carrier', carrierId: 'bank-1', paymentMethod: 'transfer' },
    })

    expect(row).toEqual({
      amount_cents: 4200,
      label: 'Trousse',
      spent_on: '2026-10-05',
      category_id: 'cat-2',
      carrier_id: 'bank-1',
      advanced_by_user_id: null,
      reimbursed_on: null,
      payment_method: 'transfer',
    })
    expect(Object.keys(row)).not.toEqual(expect.arrayContaining(['recorded_by', 'recorded_at', 'season_id']))
  })

  it('switching to a member clears the carrier; switching back clears the reimbursement', () => {
    const base = { amountCents: 4200, label: 'Trousse', spentOn: '2026-10-05', categoryId: 'cat-2' }
    expect(
      toExpenseUpdateRow({ ...base, payer: { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-06', paymentMethod: 'cash' } } }),
    ).toMatchObject({ carrier_id: null, advanced_by_user_id: 'member-1', reimbursed_on: '2026-10-06', payment_method: 'cash' })
    expect(
      toExpenseUpdateRow({ ...base, payer: { kind: 'member', userId: 'member-1', reimbursement: null } }),
    ).toMatchObject({ carrier_id: null, advanced_by_user_id: 'member-1', reimbursed_on: null, payment_method: null })
    expect(
      toExpenseUpdateRow({ ...base, payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' } }),
    ).toMatchObject({ carrier_id: 'cash-1', advanced_by_user_id: null, reimbursed_on: null, payment_method: 'cash' })
  })
})

describe('toCheckpointDetail', () => {
  it('maps the debrief and the frozen lines', () => {
    expect(
      toCheckpointDetail({
        id: 'c-1',
        checked_on: '2026-09-15',
        debrief: 'RAS',
        lines: [{ carrier_id: 'bank-1', counted_cents: 479000, theoretical_cents: 470000 }],
      }),
    ).toEqual({
      id: 'c-1',
      checkedOn: '2026-09-15',
      debrief: 'RAS',
      lines: [{ carrierId: 'bank-1', countedCents: 479000, theoreticalCents: 470000 }],
    })
  })

  it('reads a null debrief as an empty string and null lines as none', () => {
    expect(toCheckpointDetail({ id: 'c-1', checked_on: '2026-09-15', debrief: null, lines: null })).toEqual({
      id: 'c-1',
      checkedOn: '2026-09-15',
      debrief: '',
      lines: [],
    })
  })
})
