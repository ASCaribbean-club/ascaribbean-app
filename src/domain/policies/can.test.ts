import { describe, expect, it } from 'vitest'
import type { User } from '../entities/user'
import { can } from './can'

function userWith(roles: User['roles']): User {
  return { id: 'u1', fullName: 'Test User', email: 't@example.com', roles, charterAcceptedAt: null }
}

describe('can', () => {
  it('denies a coach with no assigned teams from creating a convocation', () => {
    const user = userWith([{ role: 'coach', teamIds: [] }])
    expect(can(user, 'convocation:create', { teamId: 'team-1' })).toBe(false)
  })

  it('allows a coach to create a convocation for one of their assigned teams', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'convocation:create', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a section-manager acting outside their own sectionId', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'section:manage', { sectionId: 'section-b' })).toBe(false)
  })

  it('denies a player with no matching teamId from responding to a convocation', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'convocation:respond', { teamId: 'team-2' })).toBe(false)
  })

  // specs/create-convocation.md §3, "Écart identifié" — 'section-manager' is
  // now in rbacMatrix['convocation:create'], but the actual section-scope
  // comparison is a TODO in can.ts (needs a team lookup this file can't do).
  // Fails closed in the meantime: this test should start failing the moment
  // someone resolves that TODO with a real sectionId comparison — replace it
  // with a pair of allow/deny-by-section tests at that point, don't just
  // delete it.
  it('denies a section-manager from creating a convocation until the section-scope check is implemented (see can.ts TODO)', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'convocation:create', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
  })
})
