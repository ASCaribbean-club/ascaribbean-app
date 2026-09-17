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

// specs/section-and-teams.md §2.11/AC-ST-41/AC-ST-42/AC-ST-43 — one row per
// (team, coach) pair, backing the COACH(S) columns on both /admin/sections
// and /admin/teams. Deliberately flat rather than pre-grouped by team: the
// ViewModel groups by teamId for the Équipes table and further by sectionId
// (deduplicated, AC-ST-43) for the Sections table — two different
// groupings of the exact same rows, so grouping once here would force one
// of the two screens to un-group it back.
export interface TeamCoachAssignment {
  teamId: string
  coach: TeamCoach
}

export interface CoachRepository {
  // Team-scoping is enforced by the get_team_coaches RPC's own explicit
  // team-membership check (supabase/migrations/20260904083306_profile_team_
  // coaches.sql), not by this interface — an out-of-scope teamId resolves
  // to an empty array, same "no existence leak" shape as
  // ConvocationRespondersRepository.listForConvocation.
  listForTeam(teamId: string): Promise<TeamCoach[]>

  // specs/section-and-teams.md §2.11 — the admin-only read backing
  // COACH(S). No teamId parameter and NOT a SECURITY DEFINER RPC like
  // listForTeam() above: an admin session can already read every
  // user_roles/users row unrestricted via the existing
  // user_roles_select_own/users_select_own policies' `or private.is_admin()`
  // branches (§2.11) — adding a bypass function here would be exactly the
  // "fonction security definer qui contournerait la RLS" AC-ST-08/AC-ST-35
  // forbid. For a non-admin caller this resolves to that caller's own rows
  // only (RLS, unchanged) — never called from a non-admin screen.
  listAllAssignments(): Promise<TeamCoachAssignment[]>
}
