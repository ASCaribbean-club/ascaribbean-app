import type { ClubOverview } from '../entities/club-overview'

// Backed by the security-definer get_club_overview() function
// (supabase/migrations/20261003123356_get_club_overview_rpc.sql), which is
// the authorization boundary: it raises for anyone who is neither
// authorized-officer nor admin. memberships is never opened row by row.
export interface ClubOverviewRepository {
  getOverview(): Promise<ClubOverview>
}
