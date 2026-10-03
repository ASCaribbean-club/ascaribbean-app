import type { Convocation } from '../entities/convocation'
import type { Team } from '../entities/team'

// specs/mobile-dirigeant-habilite.md §1.1/§1.2/§1.4 — club-wide reads for the
// Dirigeant views. Separate from TeamRepository / ConvocationRepository on
// purpose: those two are scoped to "one team" reads, and this pair of
// queries is the club-wide, current-season-bounded variant. Authorization is
// RLS-only (teams_select_team_scoped current-season branch,
// convocations_select_team_scoped): nothing here decides who may read.
export interface ClubScheduleRepository {
  // Teams of the CURRENT season only (AC-DH-13). Empty array when no season
  // is current (a valid state between two seasons, not an error).
  listCurrentSeasonTeams(): Promise<Team[]>

  // Convocations of the given teams, any date, any status.
  listConvocationsForTeams(teamIds: string[]): Promise<Convocation[]>
}
