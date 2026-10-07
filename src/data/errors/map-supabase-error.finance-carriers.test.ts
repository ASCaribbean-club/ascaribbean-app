import type { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { DuplicateFinanceCarrierError } from '@domain/errors/duplicate-finance-carrier-error'
import { ExpenseNotReimbursableError } from '@domain/errors/expense-not-reimbursable-error'
import { FinanceCarrierArchiveRefusedError } from '@domain/errors/finance-carrier-archive-refused-error'
import { InvalidFinanceInputError } from '@domain/errors/invalid-finance-input-error'
import { InvalidFinanceCarrierInputError } from '@domain/errors/invalid-finance-carrier-input-error'
import { mapSupabaseError } from './map-supabase-error'

const pgError = (code: string, message: string): PostgrestError =>
  ({ code, message, details: '', hint: '', name: 'PostgrestError', toJSON: () => ({}) }) as PostgrestError

// specs/web-finance-carriers.md AC-FC-05/AC-FC-07
describe('mapSupabaseError — finance carriers', () => {
  it('maps a label_key collision to DuplicateFinanceCarrierError', () => {
    expect(
      mapSupabaseError(pgError('23505', 'duplicate key value violates unique constraint "finance_carriers_label_key_unique"')),
    ).toBeInstanceOf(DuplicateFinanceCarrierError)
  })

  it.each(['finance_carriers_label_check', 'finance_carriers_label_length_check', 'finance_carriers_detail_length_check'])(
    'maps the check %s to InvalidFinanceCarrierInputError',
    (name) => {
      expect(
        mapSupabaseError(pgError('23514', `new row for relation "finance_carriers" violates check constraint "${name}"`)),
      ).toBeInstanceOf(InvalidFinanceCarrierInputError)
    },
  )
})

// specs/finances-member-advances.md AC-FA-16/AC-FA-20/AC-FA-31
describe('mapSupabaseError — archive and reimbursement', () => {
  it.each([
    ['finance_carrier_no_season', 'no-season'],
    ['finance_carrier_opening_missing', 'opening-missing'],
    ['finance_carrier_non_zero_balance', 'non-zero-balance'],
    ['finance_carrier_already_archived', 'already-archived'],
    ['finance_carrier_not_archived', 'not-archived'],
  ])('maps %s to its dedicated refusal cause', (token, reason) => {
    const error = mapSupabaseError(pgError('23514', token))
    expect(error).toBeInstanceOf(FinanceCarrierArchiveRefusedError)
    expect((error as FinanceCarrierArchiveRefusedError).reason).toBe(reason)
  })

  it('maps a P0002 on an unknown or non-advance expense to ExpenseNotReimbursableError', () => {
    expect(mapSupabaseError(pgError('P0002', 'expense_not_found'))).toBeInstanceOf(ExpenseNotReimbursableError)
    expect(mapSupabaseError(pgError('P0002', 'expense_not_an_advance'))).toBeInstanceOf(ExpenseNotReimbursableError)
  })

  it('maps an invalid reimbursement date or method to InvalidFinanceInputError', () => {
    expect(mapSupabaseError(pgError('23514', 'expense_reimbursement_invalid_date'))).toBeInstanceOf(InvalidFinanceInputError)
    expect(mapSupabaseError(pgError('23514', 'expense_reimbursement_invalid_payment_method'))).toBeInstanceOf(InvalidFinanceInputError)
  })

  it('maps the payer constraints of expenses to InvalidFinanceInputError', () => {
    expect(
      mapSupabaseError(pgError('23514', 'new row for relation "expenses" violates check constraint "expenses_payer_check"')),
    ).toBeInstanceOf(InvalidFinanceInputError)
  })
})
