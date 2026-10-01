import type { AdminConvocationFilters, AdminConvocationListItem, AdminConvocationPage } from '../entities/admin-convocation'

// specs/web-create-convocation.md UI design — fixed page size ("Charger plus"
// pattern of the audit screen). Exported so the implementation and the
// ViewModel never hardcode the number twice.
export const ADMIN_CONVOCATION_PAGE_SIZE = 25

// Read side of the backoffice convocations screens. RLS (admin reads every
// convocation) is the sole authority on what comes back; nothing here widens
// it. Filtering and pagination happen server-side (AC-WC-06), never as a
// `.filter()` on an already-fetched array. `now` is passed in (domain stays
// clock-free) and used for the period / "non saisies" bounds.
export interface AdminConvocationRepository {
  // Always sorted `date` descending. `page` is 0-based.
  list(filters: AdminConvocationFilters, page: number, now: Date): Promise<AdminConvocationPage>
  // N of the "Présences non saisies (N)" pastille: PO-WC-04 definition, on
  // the given season alone (independent of the other filters).
  countUnrecorded(seasonId: string | null, now: Date): Promise<number>
  findById(convocationId: string): Promise<AdminConvocationListItem | null>
}
