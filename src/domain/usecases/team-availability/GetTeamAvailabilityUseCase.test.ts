import { describe, expect, it } from 'vitest'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import type { TeamAvailabilityRepository, TeamAvailabilityRow } from '@domain/repositories/team-availability-repository'
import { GetTeamAvailabilityUseCase } from './GetTeamAvailabilityUseCase'

function makeUser(roles: User['roles']): User {
  return { id: 'u-1', fullName: 'Role Holder', email: 'a@b.c', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}

function repoReturning(rows: TeamAvailabilityRow[]): TeamAvailabilityRepository & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    async listForTeam(teamId) {
      calls.push(teamId)
      return rows
    },
  }
}

const rows: TeamAvailabilityRow[] = [
  { userId: 'p-3', displayName: 'Zed', status: 'suspended', startsOn: '2026-09-15', endsOn: '2026-10-06' },
  { userId: 'p-1', displayName: 'Alpha', status: 'available', startsOn: null, endsOn: null },
  { userId: 'p-2', displayName: 'Beta', status: 'medical', startsOn: '2026-09-24', endsOn: '2026-10-20' },
]

describe('GetTeamAvailabilityUseCase', () => {
  it('coach: full status with dates, sorted alphabetically', async () => {
    const repo = repoReturning(rows)
    const result = await new GetTeamAvailabilityUseCase(repo).execute({
      user: makeUser([{ role: 'coach', teamIds: ['t-1', 't-2'] }]),
      teamId: 't-1',
    })
    expect(result.view).toBe('coach')
    expect(result.entries.map((e) => e.userId)).toEqual(['p-1', 'p-2', 'p-3'])
    expect(result.entries[1]).toMatchObject({ status: 'medical', startsOn: '2026-09-24', endsOn: '2026-10-20' })
    expect(result.entries[2]).toMatchObject({ status: 'suspended', startsOn: '2026-09-15', endsOn: '2026-10-06' })
    expect(repo.calls).toEqual(['t-1'])
  })

  it('player: medical becomes unavailable with no dates; suspension keeps dates', async () => {
    const result = await new GetTeamAvailabilityUseCase(repoReturning(rows)).execute({
      user: makeUser([{ role: 'player', teamId: 't-1' }]),
      teamId: 't-1',
    })
    expect(result.view).toBe('teammate')
    expect(result.entries[1]).toEqual({ userId: 'p-2', displayName: 'Beta', status: 'unavailable', startsOn: null, endsOn: null })
    expect(result.entries[2]).toMatchObject({ status: 'suspended', startsOn: '2026-09-15', endsOn: '2026-10-06' })
    expect(JSON.stringify(result)).not.toContain('medical')
    expect(JSON.stringify(result)).not.toContain('2026-10-20')
  })

  it('player view re-projects a raw already-unavailable row without dates', async () => {
    const result = await new GetTeamAvailabilityUseCase(
      repoReturning([{ userId: 'p-2', displayName: 'Beta', status: 'unavailable', startsOn: '2026-09-24', endsOn: '2026-10-20' }]),
    ).execute({ user: makeUser([{ role: 'player', teamId: 't-1' }]), teamId: 't-1' })
    expect(result.entries[0]).toMatchObject({ status: 'unavailable', startsOn: null, endsOn: null })
  })

  it('coach+player on the same team gets the coach view', async () => {
    const result = await new GetTeamAvailabilityUseCase(repoReturning(rows)).execute({
      user: makeUser([{ role: 'player', teamId: 't-1' }, { role: 'coach', teamIds: ['t-1'] }]),
      teamId: 't-1',
    })
    expect(result.view).toBe('coach')
  })

  it('available entries carry no dates for the coach', async () => {
    const result = await new GetTeamAvailabilityUseCase(
      repoReturning([{ userId: 'p-1', displayName: 'Alpha', status: 'available', startsOn: '2026-01-01', endsOn: null }]),
    ).execute({ user: makeUser([{ role: 'coach', teamIds: ['t-1'] }]), teamId: 't-1' })
    expect(result.entries[0]).toMatchObject({ startsOn: null, endsOn: null })
  })

  it('rejects another team without touching the repository', async () => {
    const repo = repoReturning(rows)
    await expect(
      new GetTeamAvailabilityUseCase(repo).execute({ user: makeUser([{ role: 'player', teamId: 't-1' }]), teamId: 't-2' }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.calls).toEqual([])
  })

  it('rejects roles without the action', async () => {
    await expect(
      new GetTeamAvailabilityUseCase(repoReturning(rows)).execute({ user: makeUser([{ role: 'treasurer' }]), teamId: 't-1' }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('authorized-officer: teammate projection for any team — medical shown as unavailable, no medical dates', async () => {
    const repo = repoReturning([
      { userId: 'p-2', displayName: 'Beta', status: 'unavailable', startsOn: null, endsOn: null },
      { userId: 'p-1', displayName: 'Alpha', status: 'available', startsOn: null, endsOn: null },
    ])
    const result = await new GetTeamAvailabilityUseCase(repo).execute({
      user: makeUser([{ role: 'authorized-officer' }]),
      teamId: 't-9',
    })
    expect(result.view).toBe('teammate')
    expect(result.entries.map((e) => e.userId)).toEqual(['p-1', 'p-2'])
    expect(result.entries[1]).toMatchObject({ status: 'unavailable', startsOn: null, endsOn: null })
    expect(repo.calls).toEqual(['t-9'])
  })
})
