import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { Team } from '../../entities/team'
import type { ClubScheduleRepository } from '../../repositories/club-schedule-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MeetingDetailsRepository } from '../../repositories/meeting-details-repository'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import { ListClubScheduleUseCase } from './ListClubScheduleUseCase'

const now = new Date('2026-10-05T12:00:00.000Z')

function convocation(id: string, teamId: string, type: Convocation['type'], date: string): Convocation {
  return {
    id,
    teamId,
    type,
    date,
    location: 'Stade',
    trainingLocation: null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'u1',
  }
}

const teams: Team[] = [
  { id: 't1', name: 'Seniors', sectionId: 'football', seasonId: 's1' },
  { id: 't2', name: 'Equipe 2', sectionId: 'esport', seasonId: 's1' },
]

function setup(options: { teams?: Team[]; convocations?: Convocation[]; matchDetails?: MatchDetails[] } = {}) {
  const listConvocationsForTeams = vi.fn(async (_ids: string[]) => options.convocations ?? [])
  const scheduleRepository: ClubScheduleRepository = {
    listCurrentSeasonTeams: async () => options.teams ?? teams,
    listConvocationsForTeams,
  }
  const matchDetailsRepository = {
    findByConvocations: async () => options.matchDetails ?? [],
  } as unknown as MatchDetailsRepository
  const meetingDetailsRepository = {
    findByConvocationId: async (id: string) => ({ convocationId: id, title: 'Reunion', agenda: [] }),
  } as unknown as MeetingDetailsRepository
  const opponentRepository = {
    findById: async (id: string) => ({ id, name: 'Adversaire' }),
  } as unknown as OpponentRepository
  const useCase = new ListClubScheduleUseCase(scheduleRepository, matchDetailsRepository, meetingDetailsRepository, opponentRepository)
  return { useCase, listConvocationsForTeams }
}

describe('ListClubScheduleUseCase', () => {
  it('returns an empty list without reading convocations when no team exists in the current season', async () => {
    const { useCase, listConvocationsForTeams } = setup({ teams: [] })
    expect(await useCase.execute({ includePast: true, now })).toEqual([])
    expect(listConvocationsForTeams).not.toHaveBeenCalled()
  })

  it('queries the convocations of every current-season team and attaches the team', async () => {
    const { useCase, listConvocationsForTeams } = setup({
      convocations: [convocation('c1', 't2', 'training', '2026-10-07T10:00:00.000Z')],
    })
    const result = await useCase.execute({ includePast: true, now })
    expect(listConvocationsForTeams).toHaveBeenCalledWith(['t1', 't2'])
    expect(result[0].team.id).toBe('t2')
  })

  it('sorts soonest first and drops past convocations unless includePast', async () => {
    const convocations = [
      convocation('late', 't1', 'training', '2026-10-09T10:00:00.000Z'),
      convocation('past', 't1', 'training', '2026-10-01T10:00:00.000Z'),
      convocation('soon', 't1', 'training', '2026-10-06T10:00:00.000Z'),
    ]
    const withPast = await setup({ convocations }).useCase.execute({ includePast: true, now })
    expect(withPast.map((i) => i.convocation.id)).toEqual(['past', 'soon', 'late'])
    const upcomingOnly = await setup({ convocations }).useCase.execute({ includePast: false, now })
    expect(upcomingOnly.map((i) => i.convocation.id)).toEqual(['soon', 'late'])
  })

  it('ignores a convocation whose team is not in the current season', async () => {
    const { useCase } = setup({ convocations: [convocation('x', 'old-team', 'training', '2026-10-07T10:00:00.000Z')] })
    expect(await useCase.execute({ includePast: true, now })).toEqual([])
  })

  it('resolves the opponent of a match and the title of a meeting; leaves a training bare', async () => {
    const matchDetails: MatchDetails = {
      convocationId: 'm1',
      opponentId: 'o1',
      isHome: true,
      meetingPointTime: null,
      meetingPointLocation: null,
      goalsFor: null,
      goalsAgainst: null,
    }
    const { useCase } = setup({
      matchDetails: [matchDetails],
      convocations: [
        convocation('m1', 't1', 'match', '2026-10-06T10:00:00.000Z'),
        convocation('r1', 't1', 'meeting', '2026-10-07T10:00:00.000Z'),
        convocation('tr1', 't1', 'training', '2026-10-08T10:00:00.000Z'),
      ],
    })
    const [match, meeting, training] = await useCase.execute({ includePast: true, now })
    expect(match.opponent?.name).toBe('Adversaire')
    expect(match.meetingDetails).toBeNull()
    expect(meeting.meetingDetails?.title).toBe('Reunion')
    expect(training.opponent).toBeNull()
    expect(training.matchDetails).toBeNull()
  })
})
