import { describe, expect, it } from 'vitest'
import { toCoachAssignmentInsertRow } from './role-assignment-mapper'

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
