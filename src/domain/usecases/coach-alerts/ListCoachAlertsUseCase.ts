import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { Opponent } from '../../entities/opponent'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MatchEventRepository } from '../../repositories/match-event-repository'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import { getCoachAlertActions, hasAnyMissingCoachAction } from '../../policies/coach-alert-rules'
import { byDateAscending } from '../../rules/convocation-rules'

export interface ListCoachAlertsInput {
  teamId: string
  now: Date
}

export interface CoachAlertItem {
  convocation: Convocation
  // Non-null only for `convocation.type === 'match'` — same shape reasoning
  // as ListTeamConvocationsUseCase's own `ConvocationForCoach.opponent`.
  matchDetails: MatchDetails | null
  opponent: Opponent | null
  // The number of `match_events` rows of type 'goal' recorded for this
  // convocation — the exact numerator the row's "X / N buts attribués" chip
  // needs (AC-AL-09's "compteur agrégé strictement événementiel").
  attributedGoalCount: number
  attendanceConfirmationMissing: boolean
  matchScoreMissing: boolean
  goalAttributionMissing: boolean
}

// specs/coach-alerts.md §6 point 2 / PO-AL-05 (résolu) / AC-AL-21 — three
// BULK reads, independent of the number of convocations: listForTeam, then
// MatchDetailsRepository.findByConvocations / MatchEventRepository.findByConvocations
// (both already built for coach-dashboard/coach-team-stats, same RLS
// boundary as their unitary equivalents — no new policy). The opponent name
// is resolved the SAME bulk way (OpponentRepository.findByTeamId, one call,
// see that repository's own comment on why this is scoped through
// `team_opponents` rather than a per-match `findById`) — deliberately NOT
// `ListTeamConvocationsUseCase`, which emits two requests PER CONVOCATION
// for response counts this screen has no use for (see that use case's own
// per-convocation loadMatchInfo, the exact pattern this use case avoids).
export class ListCoachAlertsUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly matchDetailsRepository: MatchDetailsRepository,
    private readonly matchEventRepository: MatchEventRepository,
    private readonly opponentRepository: OpponentRepository,
  ) {}

  async execute(input: ListCoachAlertsInput): Promise<CoachAlertItem[]> {
    // teams.season_id is not null and a Team row is per-season (same
    // reasoning as GetTeamStatsUseCase's own comment), so listForTeam is
    // already scoped to the active team's current season by construction —
    // no separate season filter is applied here (PO-AL-04 default, "toute la
    // saison de l'équipe active", non-blocking).
    const convocations = await this.convocationRepository.listForTeam(input.teamId)

    // match_events.convocation_id references match_details(convocation_id)
    // (AC-MS-18) — restricting the bulk reads to 'match' convocations avoids
    // asking for rows that structurally never exist for training/meeting
    // convocations.
    const matchConvocationIds = convocations.filter((convocation) => convocation.type === 'match').map((convocation) => convocation.id)

    const [matchDetailsList, matchEvents, opponents] = await Promise.all([
      this.matchDetailsRepository.findByConvocations(matchConvocationIds),
      this.matchEventRepository.findByConvocations(matchConvocationIds),
      this.opponentRepository.findByTeamId(input.teamId),
    ])

    const matchDetailsByConvocationId = new Map(matchDetailsList.map((matchDetails) => [matchDetails.convocationId, matchDetails]))
    const opponentById = new Map(opponents.map((opponent) => [opponent.id, opponent]))

    const attributedGoalCountByConvocationId = new Map<string, number>()
    for (const event of matchEvents) {
      if (event.eventType !== 'goal') continue
      attributedGoalCountByConvocationId.set(event.convocationId, (attributedGoalCountByConvocationId.get(event.convocationId) ?? 0) + 1)
    }

    const items: CoachAlertItem[] = convocations.map((convocation) => {
      const matchDetails = matchDetailsByConvocationId.get(convocation.id) ?? null
      const attributedGoalCount = attributedGoalCountByConvocationId.get(convocation.id) ?? 0
      const actions = getCoachAlertActions(convocation, matchDetails, attributedGoalCount, input.now)
      const opponent = matchDetails ? (opponentById.get(matchDetails.opponentId) ?? null) : null

      return {
        convocation,
        matchDetails,
        opponent,
        attributedGoalCount,
        attendanceConfirmationMissing: actions.attendanceConfirmationMissing,
        matchScoreMissing: actions.matchScoreMissing,
        goalAttributionMissing: actions.goalAttributionMissing,
      }
    })

    // §1 point 4 / AC-AL-08 — ONE row per convocation, never per signal
    // (already true by construction above, `items` is built from
    // `convocations`, not from a per-signal list). Only convocations with at
    // least one missing action reach the screen. Oldest-first — UI design
    // "Questions ouvertes UI" #1: PO-AL-04 (default sort order) is open but
    // non-blocking, "plus ancien retard en tête" is the default applied here,
    // reusing `byDateAscending` (soonest-first over ALL dates, which for a
    // past-date-only alert list reads as oldest-first) rather than a fourth
    // inline comparator.
    return items.filter((item) => hasAnyMissingCoachAction(item)).sort((a, b) => byDateAscending(a.convocation, b.convocation))
  }
}
