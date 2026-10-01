// Raw shape of public.unavailabilities, see
// supabase/migrations/20261001175044_player_unavailability.sql. Dates are
// Postgres `date` columns, serialized by PostgREST as `YYYY-MM-DD`.
export interface UnavailabilityRow {
  id: string
  user_id: string
  // CHECK-constrained to 'medical' | 'suspension'.
  kind: string
  starts_on: string
  declared_by: string
  declared_at: string
  expected_return_on: string | null
  match_count: number | null
  reason: string | null
  lifted_on: string | null
}

// Insert payload — `id` and `declared_at` are database-generated.
export type UnavailabilityInsertRow = Omit<UnavailabilityRow, 'id' | 'declared_at'>

// Update payload — only the columns the migration grants UPDATE on.
export type UnavailabilityUpdateRow = Pick<
  UnavailabilityRow,
  'starts_on' | 'expected_return_on' | 'match_count' | 'reason' | 'lifted_on'
>
