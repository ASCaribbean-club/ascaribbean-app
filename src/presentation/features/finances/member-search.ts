import type { AccountOption } from '@domain/entities/finance'
import { normalizeCategoryLabel } from '@domain/rules/finance-form-rules'

// specs/finances-member-advances.md D-A6/AC-FA-05 — the search of the member
// picker: case- and accent-insensitive, using the existing normalization
// (normalizeCategoryLabel). The order of the list is the one supplied by the
// read (sorted by name), never re-sorted. An empty query keeps everyone.
export function filterAccounts(accounts: AccountOption[], query: string): AccountOption[] {
  const key = normalizeCategoryLabel(query)
  if (key === '') return accounts
  return accounts.filter((account) => normalizeCategoryLabel(account.displayName).includes(key))
}
