// specs/profile-page.md, 2026-09-04 addendum — backs the player-facing "who
// coaches my team" fact. Deliberately NOT the full `User` entity: a
// teammate's coach is the one piece of third-party nominative data this
// screen exposes (narrow, explicit exception to AC-01/AC-02, see the
// addendum), so the shape stays minimal — id + display name, nothing else
// of the coach's own profile (no email, no roles, no position).
export interface TeamCoach {
  id: string
  fullName: string
}

export interface CoachRepository {
  // Team-scoping is enforced by the get_team_coaches RPC's own explicit
  // team-membership check (supabase/migrations/20260904083306_profile_team_
  // coaches.sql), not by this interface — an out-of-scope teamId resolves
  // to an empty array, same "no existence leak" shape as
  // ConvocationRespondersRepository.listForConvocation.
  listForTeam(teamId: string): Promise<TeamCoach[]>
}
