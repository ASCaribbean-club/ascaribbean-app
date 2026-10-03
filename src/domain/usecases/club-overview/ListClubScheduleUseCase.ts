import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { MeetingDetails } from '../../entities/meeting-details'
import type { Opponent } from '../../entities/opponent'
import type { Team } from '../../entities/team'
import type { ClubScheduleRepository } from '../../repositories/club-schedule-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MeetingDetailsRepository } from '../../repositories/meeting-details-repository'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import { byDateAscending } from '../../rules/convocation-rules'

// specs/mobile-dirigeant-habilite.md §1.1/§1.2 — one club-wide item. No
// response counts on purpose (the officer cannot read convocation_responses,
// AC-DH-12/16).
export interface ClubScheduleItem {
  convocation: Convocation
  team: Team
  matchDetails: MatchDetails | null
  opponent: Opponent | null
  meetingDetails: MeetingDetails | null
}

export interface ListClubScheduleInput {
  // Calendar: true (past and upcoming). Dashboard: false is enough, but the
  // week counter ("Événements cette semaine") counts past events of the week
  // too, so the dashboard also loads everything.
  includePast: boolean
  now: Date
}

// Every convocation of the current-season teams, soonest first. The section
// filter is applied afterwards by rules/club-schedule-rules.ts (filtering
// does not refetch).
export class ListClubScheduleUseCase {
  constructor(
    private readonly clubScheduleRepository: ClubScheduleRepository,
    private readonly matchDetailsRepository: MatchDetailsRepository,
    private readonly meetingDetailsRepository: MeetingDetailsRepository,
    private readonly opponentRepository: OpponentRepository,
  ) {}

  async execute(input: ListClubScheduleInput): Promise<ClubScheduleItem[]> {
    const teams = await this.clubScheduleRepository.listCurrentSeasonTeams()
    if (teams.length === 0) return [] // no current season / no team: valid empty state

    const teamsById = new Map(teams.map((team) => [team.id, team]))
    const convocations = (await this.clubScheduleRepository.listConvocationsForTeams(teams.map((team) => team.id)))
      .filter((convocation) => input.includePast || new Date(convocation.date) > input.now)
      .sort(byDateAscending)

    const matchIds = convocations.filter((c) => c.type === 'match').map((c) => c.id)
    const matchDetailsList = matchIds.length > 0 ? await this.matchDetailsRepository.findByConvocations(matchIds) : []
    const matchDetailsByConvocation = new Map(matchDetailsList.map((details) => [details.convocationId, details]))

    const opponentIds = [...new Set(matchDetailsList.map((details) => details.opponentId))]
    const opponents = await Promise.all(opponentIds.map((id) => this.opponentRepository.findById(id)))
    const opponentsById = new Map(opponents.flatMap((opponent) => (opponent ? [[opponent.id, opponent] as const] : [])))

    const meetingDetailsList = await Promise.all(
      convocations
        .filter((c) => c.type === 'meeting')
        .map(async (c) => [c.id, await this.meetingDetailsRepository.findByConvocationId(c.id)] as const),
    )
    const meetingDetailsByConvocation = new Map(meetingDetailsList)

    return convocations.flatMap((convocation): ClubScheduleItem[] => {
      const team = teamsById.get(convocation.teamId)
      if (!team) return []
      const matchDetails = matchDetailsByConvocation.get(convocation.id) ?? null
      return [
        {
          convocation,
          team,
          matchDetails,
          opponent: matchDetails ? (opponentsById.get(matchDetails.opponentId) ?? null) : null,
          meetingDetails: meetingDetailsByConvocation.get(convocation.id) ?? null,
        },
      ]
    })
  }
}
