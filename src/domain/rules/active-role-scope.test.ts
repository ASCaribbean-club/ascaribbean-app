import { describe, expect, it } from 'vitest'
import type { Convocation } from '../entities/convocation'
import type { User } from '../entities/user'
import { hasActiveRoleForConvocation } from './active-role-scope'

function userWith(roles: User['roles']): User {
  return { id: 'u1', fullName: 'Test User', email: 't@example.com', roles, position: null, charterAcceptedAt: null }
}

function convocationForTeam(teamId: string): Convocation {
  return {
    id: 'c1',
    teamId,
    type: 'match',
    date: '2026-09-10T18:00:00.000Z',
    location: 'Stade municipal',
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'coach-1',
  }
}

describe('hasActiveRoleForConvocation', () => {
  it('allows a player whose team matches the convocation', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(hasActiveRoleForConvocation(user, 'player', convocationForTeam('team-1'))).toBe(true)
  })

  it('denies a player whose team does not match the convocation', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(hasActiveRoleForConvocation(user, 'player', convocationForTeam('team-2'))).toBe(false)
  })

  it('allows a coach when the convocation team is one of several teamIds', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1', 'team-2', 'team-3'] }])
    expect(hasActiveRoleForConvocation(user, 'coach', convocationForTeam('team-2'))).toBe(true)
  })

  it('denies a coach when the convocation team is none of their teamIds', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1', 'team-2'] }])
    expect(hasActiveRoleForConvocation(user, 'coach', convocationForTeam('team-3'))).toBe(false)
  })

  it('denies when the user has no assignment at all for the active role', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(hasActiveRoleForConvocation(user, 'player', convocationForTeam('team-1'))).toBe(false)
  })
})
