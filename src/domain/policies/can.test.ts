import { describe, expect, it } from 'vitest'
import type { User } from '../entities/user'
import { can } from './can'

function userWith(roles: User['roles']): User {
  return { id: 'u1', fullName: 'Test User', email: 't@example.com', roles, position: null, charterAcceptedAt: null }
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

  it('allows a section-manager to create a convocation for a team in their section', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'convocation:create', { teamId: 'team-1', sectionId: 'section-a' })).toBe(true)
  })

  it('denies a section-manager from creating a convocation for a team outside their section', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'convocation:create', { teamId: 'team-1', sectionId: 'section-b' })).toBe(false)
  })

  // specs/coach-attendance-confirmation.md §2/§7 — same coverage shape as
  // the two 'convocation:create' coach tests above, for the newly-added
  // action. This pair is what proves the can.ts fix actually closes the
  // gap (a coach without this check could "validate" a team they don't
  // coach) rather than just compiling.
  it('allows a coach to validate attendance for one of their assigned teams', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'attendance:validate', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a coach from validating attendance for a team they are not assigned to', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'attendance:validate', { teamId: 'team-2' })).toBe(false)
  })
})
