import { describe, expect, it } from 'vitest'
import type { User } from '@domain/entities/user'
import type { TeamAvailabilityRepository, TeamAvailabilityRow } from '@domain/repositories/team-availability-repository'
import { GetConvocationAvailabilityUseCase } from './GetConvocationAvailabilityUseCase'

function makeUser(roles: User['roles']): User {
  return { id: 'u-1', fullName: 'Role Holder', email: 'a@b.c', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}

const coach = makeUser([{ role: 'coach', teamIds: ['t-1'] }])

function repoReturning(rows: TeamAvailabilityRow[]) {
  const calls: Array<{ teamId: string; on?: string }> = []
  const repository: TeamAvailabilityRepository = {
    async listForTeam(teamId, on) {
      calls.push({ teamId, on })
      return rows
    },
  }
  return { repository, calls }
}

const row = (userId: string, status: TeamAvailabilityRow['status'], extra: Partial<TeamAvailabilityRow> = {}): TeamAvailabilityRow => ({
  userId, displayName: userId, status, startsOn: null, endsOn: null, reason: null, ...extra,
})

describe('GetConvocationAvailabilityUseCase', () => {
  it('flags every unavailable player and omits the available ones', async () => {
    const { repository, calls } = repoReturning([
      row('p-1', 'available'),
      row('p-2', 'absent', { startsOn: '2026-10-01', endsOn: '2026-10-20', reason: 'En vacances' }),
      row('p-3', 'suspended', { endsOn: '2026-10-30' }),
      row('p-4', 'medical', { startsOn: '2026-10-01', endsOn: '2026-11-01' }),
    ])
    const result = await new GetConvocationAvailabilityUseCase(repository).execute({ user: coach, teamId: 't-1', on: '2026-10-12' })

    expect(Object.keys(result)).toEqual(['p-2', 'p-3', 'p-4'])
    expect(result['p-2']).toEqual({ userId: 'p-2', reason: 'absent', detail: 'En vacances', returnOn: '2026-10-20' })
    expect(result['p-3']).toMatchObject({ reason: 'suspended', returnOn: '2026-10-30' })
    expect(calls).toEqual([{ teamId: 't-1', on: '2026-10-12' }])
  })

  it('never exposes health detail: medical collapses to a bare "unavailable"', async () => {
    const { repository } = repoReturning([row('p-4', 'medical', { startsOn: '2026-10-01', endsOn: '2026-11-01' })])
    const result = await new GetConvocationAvailabilityUseCase(repository).execute({ user: coach, teamId: 't-1' })
    expect(result['p-4']).toEqual({ userId: 'p-4', reason: 'unavailable', detail: null, returnOn: null })
  })

  it('returns {} without reading when the caller may not read the team availability', async () => {
    const { repository, calls } = repoReturning([row('p-2', 'absent', { reason: 'x' })])
    const result = await new GetConvocationAvailabilityUseCase(repository).execute({
      user: makeUser([{ role: 'coach', teamIds: ['t-9'] }]),
      teamId: 't-1',
    })
    expect(result).toEqual({})
    expect(calls).toEqual([])
  })
})
