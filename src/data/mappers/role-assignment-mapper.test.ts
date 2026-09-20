import { describe, expect, it } from 'vitest'
import type { AssignableRoleAssignment } from '@domain/entities/user'
import { toCoachAssignmentInsertRow, toRoleAssignmentInsertRows } from './role-assignment-mapper'

describe('toCoachAssignmentInsertRow', () => {
  it('always sets role to coach and section_id to null, regardless of the given ids', () => {
    const row = toCoachAssignmentInsertRow('user-1', 'team-1')

    expect(row).toEqual({
      user_id: 'user-1',
      role: 'coach',
      team_id: 'team-1',
      section_id: null,
    })
  })

  it('maps a different (userId, teamId) pair without cross-contamination', () => {
    const row = toCoachAssignmentInsertRow('user-2', 'team-2')

    expect(row.user_id).toBe('user-2')
    expect(row.team_id).toBe('team-2')
  })
})

describe('toRoleAssignmentInsertRows', () => {
  it('maps a player assignment to a single row carrying team_id, section_id null', () => {
    const assignment: AssignableRoleAssignment = { role: 'player', teamId: 'team-1' }
    expect(toRoleAssignmentInsertRows('user-1', assignment)).toEqual([
      { user_id: 'user-1', role: 'player', team_id: 'team-1', section_id: null },
    ])
  })

  // §2.6/AC-WU-06 — one row per team, mirroring user_roles' own shape for
  // this role.
  it('maps a coach assignment to one row per team', () => {
    const assignment: AssignableRoleAssignment = { role: 'coach', teamIds: ['team-1', 'team-2'] }
    expect(toRoleAssignmentInsertRows('user-1', assignment)).toEqual([
      { user_id: 'user-1', role: 'coach', team_id: 'team-1', section_id: null },
      { user_id: 'user-1', role: 'coach', team_id: 'team-2', section_id: null },
    ])
  })

  it('maps a coach assignment with zero teams to zero rows', () => {
    const assignment: AssignableRoleAssignment = { role: 'coach', teamIds: [] }
    expect(toRoleAssignmentInsertRows('user-1', assignment)).toEqual([])
  })

  it('maps a section-manager assignment to a single row carrying section_id, team_id null', () => {
    const assignment: AssignableRoleAssignment = { role: 'section-manager', sectionId: 'section-1' }
    expect(toRoleAssignmentInsertRows('user-1', assignment)).toEqual([
      { user_id: 'user-1', role: 'section-manager', team_id: null, section_id: 'section-1' },
    ])
  })

  // §2.6c — the four unscoped roles: both team_id and section_id null.
  it.each(['authorized-officer', 'treasurer', 'medical-referent', 'volunteer'] as const)(
    'maps the unscoped role %s to a single row with both ids null',
    (role) => {
      const assignment: AssignableRoleAssignment = { role }
      expect(toRoleAssignmentInsertRows('user-1', assignment)).toEqual([{ user_id: 'user-1', role, team_id: null, section_id: null }])
    },
  )
})
