import type { ConvocationStatus, ConvocationType, DeclaredStatus } from '@domain/entities/convocation'

// Raw shape of public.convocations, see supabase/migrations/20260811171754_initial_schema.sql
// — `created_by` added per specs/create-convocation.md §2 (migration not
// written yet as part of this scaffold, see that spec's §2 SQL snippet).
export interface ConvocationRow {
  id: string
  team_id: string
  type: ConvocationType
  date: string
  location: string
  status: ConvocationStatus
  closed_at: string | null
  closed_by: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  created_by: string
}

// Raw shape of public.convocation_responses — last-value-wins "current
// state" table, not an append-only log (CLAUDE.md §6).
export interface ConvocationResponseRow {
  id: string
  convocation_id: string
  user_id: string
  status: DeclaredStatus
  reason: string | null
  responded_at: string | null
}
