import type { ConvocationStatus, ConvocationType, DeclaredStatus } from '@domain/entities/convocation'

// Raw shape of public.convocations, see supabase/migrations/20260811171754_initial_schema.sql.
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
