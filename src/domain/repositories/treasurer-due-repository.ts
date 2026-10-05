import type { TreasurerDue } from '../entities/treasurer-due'

// Backed by the security-definer get_treasurer_dues() function
// (supabase/migrations/20261005130000_get_treasurer_dues_rpc.sql), which is
// the authorization boundary: it raises for anyone who is neither treasurer,
// authorized-officer nor admin ('dues:read'). memberships/users/user_roles are never opened row by row.
// Current season and non-archived memberships only, decided by Postgres.
export interface TreasurerDueRepository {
  listCurrentSeasonDues(): Promise<TreasurerDue[]>
}
