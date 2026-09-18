import type { MembershipStatus } from '@domain/entities/membership'

// Raw shape of public.memberships, see
// supabase/migrations/20260811171754_initial_schema.sql and
// supabase/migrations/20260917174652_web_memberships_write_policies.sql
// (season_id is `not null` as of that migration; archived_at/archived_by
// added by it too, §2.5/§2.6a).
export interface MembershipRow {
  id: string
  user_id: string
  licence_number: string | null
  status: MembershipStatus
  season_id: string
  valid_until: string
  archived_at: string | null
  archived_by: string | null
  // §2.1/AC-WM-34 — amendement du 2026-09-17, PO-WM-01 resolved. Integer
  // cents, nullable (§2.1).
  amount_due_cents: number | null
}

// specs/web-memberships.md §2.10 — insert payload for
// MembershipRepositoryImpl.create()/replaceArchived(). No `id`/`archived_at`/
// `archived_by` (DB defaults / explicitly reset by replaceArchived()).
export interface MembershipInsertRow {
  user_id: string
  licence_number: string | null
  status: MembershipStatus
  season_id: string
  valid_until: string
  // §2.1 — always null on insert: the "Nouvelle adhésion" dialog does not
  // carry this field (CreateMembershipUseCase sets it explicitly, never
  // guessed at in this mapper).
  amount_due_cents: number | null
}

// Update payload for MembershipRepositoryImpl.update() — same 6 columns.
export interface MembershipUpdateRow {
  user_id: string
  licence_number: string | null
  status: MembershipStatus
  season_id: string
  valid_until: string
  amount_due_cents: number | null
}
