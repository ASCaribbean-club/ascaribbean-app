import type { MembershipStatus } from '@domain/entities/membership'

// Raw shape of public.memberships, see
// supabase/migrations/20260811171754_initial_schema.sql.
export interface MembershipRow {
  id: string
  user_id: string
  licence_number: string | null
  status: MembershipStatus
  season_id: string | null
  valid_until: string
}
