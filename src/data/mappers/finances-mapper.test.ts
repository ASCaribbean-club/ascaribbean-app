import { describe, expect, it } from 'vitest'
import type { FinancesSnapshotDto } from '../dto/finances-dto'
import {
  toCarrierOption,
  toExpense,
  toExpenseCategory,
  toExpenseInsertRow,
  toFinancesSnapshot,
  toOpeningBalance,
  toOpeningBalanceInsertRow,
  toRecordedCheckpoint,
} from './finances-mapper'

describe('toFinancesSnapshot', () => {
  const dto: FinancesSnapshotDto = {
    season: { id: 's-1', label: '2026-2027', start_date: '2026-09-01', end_date: '2027-06-30' },
    carriers: [
      { id: 'bank-1', label: 'Compte', kind: 'bank', detail: 'Banque · Courant', manager_name: null, opening_balance_cents: 100000, income_cents: 5000 },
      { id: 'cash-1', label: 'Caisse', kind: 'cash', detail: null, manager_name: 'Responsable', opening_balance_cents: null, income_cents: null },
    ],
    unattributed_income_cents: 2500,
    categories: [{ id: 'cat-1', label: 'Équipement', color_index: 2 }],
    expenses: [
      { id: 'e-1', category_id: 'cat-1', carrier_id: 'cash-1', amount_cents: 3800, label: 'Trousse', spent_on: '2026-10-04', payment_method: 'cash', recorded_at: '2026-10-04T10:00:00.000Z' },
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
      openingBalanceCents: 100000,
      incomeCents: 5000,
    })
    expect(snapshot.unattributedIncomeCents).toBe(2500)
    expect(snapshot.categories).toEqual([{ id: 'cat-1', label: 'Équipement', colorIndex: 2 }])
    expect(snapshot.expenses[0]).toMatchObject({ categoryId: 'cat-1', carrierId: 'cash-1', amountCents: 3800, spentOn: '2026-10-04', paymentMethod: 'cash' })
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
      expenses: null,
      checkpoints: null,
    })
    expect(snapshot).toEqual({ season: null, carriers: [], unattributedIncomeCents: 0, categories: [], expenses: [], checkpoints: [] })
  })

  it('tolerates a checkpoint with null lines', () => {
    const snapshot = toFinancesSnapshot({ ...dto, checkpoints: [{ id: 'c', checked_on: '2026-09-15', recorded_at: 'x', lines: null }] })
    expect(snapshot.checkpoints[0].lines).toEqual([])
  })
})

describe('enum fallbacks', () => {
  it('reads an unknown carrier kind as a bank and an unknown method as card', () => {
    expect(toCarrierOption({ id: 'x', label: 'X', kind: 'weird' }).kind).toBe('bank')
    expect(toCarrierOption({ id: 'x', label: 'X', kind: 'cash' }).kind).toBe('cash')
    expect(
      toExpense({ id: 'e', category_id: 'c', carrier_id: 'k', amount_cents: 1, label: 'l', spent_on: '2026-10-01', payment_method: 'weird', recorded_at: 't' }).paymentMethod,
    ).toBe('card')
  })

  it('maps the five expense methods through unchanged', () => {
    for (const method of ['card', 'transfer', 'cash', 'cheque', 'direct_debit']) {
      expect(
        toExpense({ id: 'e', category_id: 'c', carrier_id: 'k', amount_cents: 1, label: 'l', spent_on: '2026-10-01', payment_method: method, recorded_at: 't' }).paymentMethod,
      ).toBe(method)
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
      carrierId: 'cash-1',
      paymentMethod: 'direct_debit',
      recordedBy: 'actor-1',
    })
    expect(row).toEqual({
      season_id: 's-1',
      category_id: 'cat-1',
      carrier_id: 'cash-1',
      amount_cents: 3800,
      label: 'Trousse',
      spent_on: '2026-10-04',
      payment_method: 'direct_debit',
      recorded_by: 'actor-1',
    })
    expect(row).not.toHaveProperty('id')
    expect(row).not.toHaveProperty('recorded_at')
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
