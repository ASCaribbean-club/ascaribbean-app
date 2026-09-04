import type { Membership } from '../entities/membership'

// specs/profile-page.md, 2026-09-04 addendum — resolves PO-PR-06. Scoped to
// (userId, seasonId) rather than just userId: `memberships` has no unique
// constraint on user_id (a member can carry one row per season over time),
// so "the" membership is meaningless without pinning a season — mirrors how
// TeamRepository already resolves teams against the current season rather
// than trusting a bare id lookup.
export interface MembershipRepository {
  findForUserAndSeason(userId: string, seasonId: string): Promise<Membership | null>
}
