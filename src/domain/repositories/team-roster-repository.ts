// specs/coach-team-stats.md §1/§4.3/§6 — the "Effectif" section's own roster
// read: every PLAYER currently assigned to a team, independent of any single
// convocation (unlike ConvocationRespondersRepository, which is scoped to
// one convocation's own roster). No repository/RPC for this existed anywhere
// in the repo before this pass — get_team_coaches
// (supabase/migrations/20260904083306_profile_team_coaches.sql) is the
// closest precedent (same SECURITY DEFINER shape, same "explicit
// is_coach_of_team/is_admin EXISTS check replaces RLS inside the function
// body" reasoning), just for role = 'coach' instead of role = 'player'.
export interface TeamRosterPlayer {
  userId: string
  displayName: string
}

export interface TeamRosterRepository {
  // Team-scoping is enforced by the get_team_roster RPC's own explicit
  // is_coach_of_team/is_admin check, not by this interface — an out-of-scope
  // teamId (caller isn't that team's coach, nor an admin) resolves to an
  // empty array, same "no existence leak" shape as
  // ConvocationRespondersRepository.listForConvocation.
  listPlayers(teamId: string): Promise<TeamRosterPlayer[]>
}
