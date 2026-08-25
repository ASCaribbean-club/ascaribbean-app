import type { Opponent } from '../entities/opponent'

// specs/create-convocation.md §2 — findByTeamId scopes through team_opponents
// (season + category for free via teams.season_id/section_id, see that
// table's migration comment), not a query on Opponent itself.
//
// Who may call create() is still OPEN (see DEFAULTS-A-CHALLENGER.md,
// "Autorisation de création d'un opponents") — RLS restricts writes to
// admin as a provisional default, not a decision recorded in rbac-matrix.ts.
export interface OpponentRepository {
  findByTeamId(teamId: string): Promise<Opponent[]>
  // `opponents` is open-read reference data (see the migration comment next
  // to `opponents_select_authenticated`), so resolving a single id — e.g. the
  // one stored on a MatchDetails row — doesn't need the team_opponents join
  // that findByTeamId goes through.
  findById(id: string): Promise<Opponent | null>
  create(name: string): Promise<Opponent>
}