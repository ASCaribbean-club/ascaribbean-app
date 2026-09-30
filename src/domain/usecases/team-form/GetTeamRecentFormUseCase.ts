import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import { computeRecentForm, sumGoals, type RecordedMatchResult } from '../../policies/team-form-rules'
import type { MatchOutcome } from '../../policies/match-outcome-rules'

export interface GetTeamRecentFormInput {
  teamId: string
}

export interface TeamRecentForm {
  form: MatchOutcome[]
  goalsFor: number
  goalsAgainst: number
}

// specs/coach-dashboard.md §1 point 7 (PO-1) / specs/player-dashboard.md
// PO-PD-07 — both resolved (développeuse, 2026-09-30): the
// "résultats et compétitions" module they were waiting on is exactly what
// specs/match-stats.md built since (MatchDetails.goalsFor/goalsAgainst).
// Shared by coach-dashboard's FormAndGoalsRow AND player-dashboard's
// equivalent block — a team's recent form/goals has no per-role variant,
// only a per-team one, so one use case backs both screens (same
// "client-side aggregation over existing repository reads" shape as
// GetTeamStatsUseCase, no new RPC needed).
export const RECENT_MATCH_COUNT = 5

export class GetTeamRecentFormUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly matchDetailsRepository: MatchDetailsRepository,
  ) {}

  async execute(input: GetTeamRecentFormInput): Promise<TeamRecentForm> {
    // teams.season_id is not null and a Team row is per-season (same
    // reasoning as GetTeamStatsUseCase), so listForTeam is already scoped
    // to the current season — no separate season filter here either.
    const convocations = await this.convocationRepository.listForTeam(input.teamId)
    const matchConvocations = convocations.filter((convocation) => convocation.type === 'match')
    const matchDetailsByConvocationId = new Map(
      (await this.matchDetailsRepository.findByConvocations(matchConvocations.map((convocation) => convocation.id))).map((details) => [
        details.convocationId,
        details,
      ]),
    )

    // AC-MS-15 — both null together means "score pas encore enregistré":
    // a match not yet played never counts toward form or goal totals.
    const recordedMatches: RecordedMatchResult[] = matchConvocations.flatMap((convocation) => {
      const details = matchDetailsByConvocationId.get(convocation.id)
      if (!details || details.goalsFor === null || details.goalsAgainst === null) return []
      return [{ date: convocation.date, goalsFor: details.goalsFor, goalsAgainst: details.goalsAgainst }]
    })

    const { goalsFor, goalsAgainst } = sumGoals(recordedMatches)

    return {
      form: computeRecentForm(recordedMatches, RECENT_MATCH_COUNT),
      goalsFor,
      goalsAgainst,
    }
  }
}
