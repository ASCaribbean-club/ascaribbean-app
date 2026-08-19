import { describe, expect, it, vi } from 'vitest'
import type { Team } from '../../entities/team'
import type { TeamRepository } from '../../repositories/team-repository'
import { GetCoachTeamsUseCase } from './GetCoachTeamsUseCase'

describe('GetCoachTeamsUseCase', () => {
  it('pairs each of the coach teams with its active member count', async () => {
    const teamA: Team = { id: 'team-a', name: 'Seniors A', sectionId: 'section-1', seasonId: 'season-1' }
    const teamB: Team = { id: 'team-b', name: 'Seniors B', sectionId: 'section-1', seasonId: 'season-1' }
    const findByIds = vi.fn().mockResolvedValue([teamA, teamB])
    const countActiveMembers = vi.fn().mockImplementation((teamId: string) =>
      Promise.resolve(teamId === 'team-a' ? 18 : 12),
    )
    const teamRepository = { findByIds, countActiveMembers } as unknown as TeamRepository

    const result = await new GetCoachTeamsUseCase(teamRepository).execute({
      coachTeamIds: ['team-a', 'team-b'],
    })

    expect(findByIds).toHaveBeenCalledWith(['team-a', 'team-b'])
    expect(result).toEqual([
      { team: teamA, activeMemberCount: 18 },
      { team: teamB, activeMemberCount: 12 },
    ])
  })

  it('returns an empty list for a coach with no team assignment', async () => {
    const findByIds = vi.fn().mockResolvedValue([])
    const countActiveMembers = vi.fn()
    const teamRepository = { findByIds, countActiveMembers } as unknown as TeamRepository

    const result = await new GetCoachTeamsUseCase(teamRepository).execute({ coachTeamIds: [] })

    expect(result).toEqual([])
    expect(countActiveMembers).not.toHaveBeenCalled()
  })
})
