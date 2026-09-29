import type { AttendanceRecordRepository } from '../../repositories/attendance-record-repository'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchEventRepository } from '../../repositories/match-event-repository'
import type { TeamRosterPlayer, TeamRosterRepository } from '../../repositories/team-roster-repository'
import {
  attendanceRate,
  tallyAttendance,
  tallyAttendanceByPlayer,
  tallyCardsByPlayer,
  tallyGoalsByPlayer,
  tallyTeamCards,
  type AttendanceTally,
  type CardTally,
} from '../../policies/team-stats-rules'

export interface GetTeamStatsInput {
  teamId: string
}

export interface TeamAttendanceSummary {
  tally: AttendanceTally
  // null exactly when tally.totalCount === 0 (AC-CTS-16/AC-CTS-17) — see
  // domain/policies/team-stats-rules.ts's attendanceRate for the boundary.
  rate: number | null
}

export interface TeamStats {
  roster: TeamRosterPlayer[]
  attendance: {
    team: TeamAttendanceSummary
    // Keyed by userId — AC-CTS-07: a player with zero AttendanceRecord rows
    // over the period has NO entry here. The roster above is still the
    // source of truth for who's on the list; the presentation layer renders
    // an explicit "no data" state for any roster entry missing from this map.
    byPlayer: Record<string, TeamAttendanceSummary>
  }
  // Keyed by userId, total goals scored — §4.1, the segmented control's
  // "Buts" headline. Deliberately NOT the "Meilleurs buteurs" ranking
  // (TeamScorerRankingCard, PO-CTS-02, not built in this pass) — see this
  // use case's own note below.
  goalsByPlayer: Record<string, number>
  cards: {
    team: CardTally
    byPlayer: Record<string, CardTally>
  }
}

// specs/coach-team-stats.md §1/§2/§6 — the team-stats screen's single read,
// combining the three families (Présence/Buts/Cartons) plus the roster, the
// same "one use case per screen, several repositories" shape as
// ListTeamConvocationsUseCase (coach-dashboard). Every repository call below
// reuses an EXISTING RLS boundary — see each repository interface's own
// comment — this use case adds no new query surface of its own, only
// orchestration + the pure aggregation in domain/policies/team-stats-rules.ts.
//
// ⚠️ Deliberately NOT built here, both explicitly out of scope for this pass:
//   - Any competition-type (league/friendly) filtering (PO-CTS-01/AC-CTS-12)
//     — `competition_type` doesn't exist in the database yet.
//   - The "Meilleurs buteurs" ranking (TeamScorerRankingCard, PO-CTS-02) —
//     needs `team_scorer_ranking`, which doesn't exist yet either.
//   - The mockup's "X,X / 18 en moyenne par séance" team-wide average
//     (PO-CTS-04(a)/(b)/(d)) — that figure needs a reference headcount
//     ("who's actually expected to attend a session") this use case never
//     computes. `attendance.team` below is instead the literal
//     present/total ratio across every AttendanceRecord that actually
//     exists for the team's convocations this season — it answers none of
//     PO-CTS-04's four sub-questions by picking a convocation subset or an
//     "expected attendees" figure, it only reports what was actually
//     recorded (see team-stats-rules.ts's own comment on tallyAttendance).
export class GetTeamStatsUseCase {
  constructor(
    private readonly teamRosterRepository: TeamRosterRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly attendanceRecordRepository: AttendanceRecordRepository,
    private readonly matchEventRepository: MatchEventRepository,
  ) {}

  async execute(input: GetTeamStatsInput): Promise<TeamStats> {
    const [roster, convocations] = await Promise.all([
      this.teamRosterRepository.listPlayers(input.teamId),
      this.convocationRepository.listForTeam(input.teamId),
    ])

    // teams.season_id is not null and a Team row is per-season (§ PO-CTS-03
    // — "une nouvelle ligne Team est créée chaque saison"), so
    // listForTeam(input.teamId) is already scoped to the current season by
    // construction: no separate season filter is applied here.
    const convocationIds = convocations.map((convocation) => convocation.id)
    // match_events.convocation_id references match_details(convocation_id),
    // which is itself convocations.id (1:1) — restricting to 'match'
    // convocations before the bulk read avoids asking for events on
    // training/meeting convocations, which structurally never have any
    // (AC-MS-18).
    const matchConvocationIds = convocations.filter((convocation) => convocation.type === 'match').map((convocation) => convocation.id)

    const [attendanceRecords, matchEvents] = await Promise.all([
      this.attendanceRecordRepository.findByConvocations(convocationIds),
      this.matchEventRepository.findByConvocations(matchConvocationIds),
    ])

    const teamAttendanceTally = tallyAttendance(attendanceRecords)
    const attendanceByPlayerTally = tallyAttendanceByPlayer(attendanceRecords)

    return {
      roster,
      attendance: {
        team: { tally: teamAttendanceTally, rate: attendanceRate(teamAttendanceTally) },
        byPlayer: Object.fromEntries(
          Object.entries(attendanceByPlayerTally).map(([userId, tally]) => [userId, { tally, rate: attendanceRate(tally) }]),
        ),
      },
      goalsByPlayer: tallyGoalsByPlayer(matchEvents),
      cards: {
        team: tallyTeamCards(matchEvents),
        byPlayer: tallyCardsByPlayer(matchEvents),
      },
    }
  }
}
