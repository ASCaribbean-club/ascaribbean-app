// specs/web-finance-carriers.md §2.1 — public.finance_carriers, columns the
// client reads, with the manager's displayable name embedded. `label_key` is
// computed server-side and never read nor sent by the client.
export interface FinanceCarrierRow {
  id: string
  label: string
  kind: string
  detail: string | null
  manager_user_id: string | null
  // null = active (specs/finances-member-advances.md §2.6).
  archived_at: string | null
  // PostgREST embed `manager:manager_user_id(full_name)`.
  manager: { full_name: string } | null
}

// INSERT payload ('finance_carrier:create'): the four granted columns.
export interface FinanceCarrierInsertRow {
  label: string
  kind: string
  detail: string | null
  manager_user_id: string | null
}

// UPDATE payload ('finance_carrier:update'): `kind` is never part of it.
export interface FinanceCarrierUpdateRow {
  label: string
  detail: string | null
  manager_user_id: string | null
}
