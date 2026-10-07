import { DomainError } from './domain-error'

export type FinanceCarrierArchiveRefusal =
  | 'no-season'
  | 'opening-missing'
  | 'non-zero-balance'
  | 'already-archived'
  | 'not-archived'

// specs/finances-member-advances.md AC-FA-16/AC-FA-20 — the database refused an
// archive or a restore, and says why. Thrown by data/errors/map-supabase-error.ts
// from the dedicated message tokens of archive_finance_carrier() /
// restore_finance_carrier(); the cause picks the French message shown in the
// confirmation dialog (never raw Postgres text).
export class FinanceCarrierArchiveRefusedError extends DomainError {
  constructor(
    readonly reason: FinanceCarrierArchiveRefusal,
    message: string,
  ) {
    super(message)
  }
}
