import { DomainError } from './domain-error'

// specs/web-finance-carriers.md AC-FC-05/AC-FC-07 — a carrier label already
// exists (case and accent insensitive, all kinds mixed, PO-FC-04). Thrown by
// the carrier use cases, and by data/errors/map-supabase-error.ts from
// finance_carriers_label_key_unique.
export class DuplicateFinanceCarrierError extends DomainError {}
