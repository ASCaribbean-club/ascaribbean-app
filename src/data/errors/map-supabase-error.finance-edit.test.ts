import type { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { DuplicateExpenseCategoryError } from '@domain/errors/duplicate-expense-category-error'
import { ExpenseCategoryInUseError } from '@domain/errors/expense-category-in-use-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { mapSupabaseError } from './map-supabase-error'

const pgError = (code: string, message: string): PostgrestError => ({ code, message, details: '', hint: '', name: 'PostgrestError', toJSON: () => ({}) }) as PostgrestError

// specs/mob-treasurer-finances-edit.md AC-FIE-08/09
describe('mapSupabaseError — finances edit', () => {
  it('maps the expenses FK restrict to ExpenseCategoryInUseError', () => {
    expect(
      mapSupabaseError(pgError('23503', 'update or delete on table "expense_categories" violates foreign key constraint "expenses_category_id_fkey" on table "expenses"')),
    ).toBeInstanceOf(ExpenseCategoryInUseError)
  })

  it('keeps any other foreign key violation as NotFoundError', () => {
    expect(mapSupabaseError(pgError('23503', 'violates foreign key constraint "something_else_fkey"'))).toBeInstanceOf(NotFoundError)
  })

  it('maps a rename collision to DuplicateExpenseCategoryError', () => {
    expect(mapSupabaseError(pgError('23505', 'duplicate key value violates unique constraint "expense_categories_label_key_unique"'))).toBeInstanceOf(
      DuplicateExpenseCategoryError,
    )
  })

  it('maps "not found" of the correction functions (P0002) to NotFoundError and a refused role to ForbiddenError', () => {
    expect(mapSupabaseError(pgError('P0002', 'checkpoint not found'))).toBeInstanceOf(NotFoundError)
    expect(mapSupabaseError(pgError('42501', 'not allowed'))).toBeInstanceOf(ForbiddenError)
  })
})
