import { describe, expect, it } from 'vitest'
import type { AssignableRoleAssignment } from '../entities/user'
import { InvalidRoleAssignmentInputError } from '../errors/invalid-role-assignment-input-error'
import { scopeContextFor, validateRoleAssignmentScope } from './role-assignment-scope'

// specs/web-users-role-edit-remove.md §2.2 rule 2/§2.7/AC-WU-48 — this file
// used to be AssignRoleUseCase's own private helpers, covered only
// indirectly through that use case's tests. Extracted into a shared
// implementation, now tested directly since three use cases depend on it.
describe('validateRoleAssignmentScope', () => {
  it('throws InvalidRoleAssignmentInputError when the player role has no teamId', () => {
    const assignment = { role: 'player', teamId: '' } as unknown as AssignableRoleAssignment
    expect(() => validateRoleAssignmentScope(assignment)).toThrow(InvalidRoleAssignmentInputError)
  })

  it('accepts a player role with a teamId', () => {
    expect(() => validateRoleAssignmentScope({ role: 'player', teamId: 'team-1' })).not.toThrow()
  })

  it('throws InvalidRoleAssignmentInputError when the coach role has zero teams', () => {
    expect(() => validateRoleAssignmentScope({ role: 'coach', teamIds: [] })).toThrow(InvalidRoleAssignmentInputError)
  })

  it('accepts a coach role with at least one team', () => {
    expect(() => validateRoleAssignmentScope({ role: 'coach', teamIds: ['team-1'] })).not.toThrow()
  })

  it('throws InvalidRoleAssignmentInputError when the section-manager role has no sectionId', () => {
    const assignment = { role: 'section-manager', sectionId: '' } as unknown as AssignableRoleAssignment
    expect(() => validateRoleAssignmentScope(assignment)).toThrow(InvalidRoleAssignmentInputError)
  })

  it('accepts a section-manager role with a sectionId', () => {
    expect(() => validateRoleAssignmentScope({ role: 'section-manager', sectionId: 'section-1' })).not.toThrow()
  })

  it.each(['authorized-officer', 'treasurer', 'medical-referent', 'volunteer'] as const)(
    'accepts the unscoped role %s with no scope to validate',
    (role) => {
      expect(() => validateRoleAssignmentScope({ role })).not.toThrow()
    },
  )
})

describe('scopeContextFor', () => {
  it("resolves a player's teamId as the targeted context", () => {
    expect(scopeContextFor({ role: 'player', teamId: 'team-1' })).toEqual({ teamId: 'team-1' })
  })

  it("resolves a section-manager's sectionId as the targeted context", () => {
    expect(scopeContextFor({ role: 'section-manager', sectionId: 'section-1' })).toEqual({ sectionId: 'section-1' })
  })

  it('resolves an empty context for a coach (AuthorizationContext cannot carry several teamIds)', () => {
    expect(scopeContextFor({ role: 'coach', teamIds: ['team-1', 'team-2'] })).toEqual({})
  })

  it.each(['authorized-officer', 'treasurer', 'medical-referent', 'volunteer'] as const)(
    'resolves an empty (club-wide) context for the unscoped role %s',
    (role) => {
      expect(scopeContextFor({ role })).toEqual({})
    },
  )
})
