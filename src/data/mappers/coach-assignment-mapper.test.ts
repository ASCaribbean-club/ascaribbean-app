import { describe, expect, it } from 'vitest'
import type { CoachAssignmentDto } from '../dto/coach-assignment-dto'
import { toTeamCoachAssignment } from './coach-assignment-mapper'

describe('toTeamCoachAssignment', () => {
  it('maps a joined row to a teamId + coach pair', () => {
    const dto: CoachAssignmentDto = { team_id: 'team-1', user_id: 'user-1', users: { full_name: 'Coach' } }

    expect(toTeamCoachAssignment(dto)).toEqual({
      teamId: 'team-1',
      coach: { id: 'user-1', fullName: 'Coach' },
    })
  })

  // §2.11 — the DTO's own comment: this should never happen given the
  // repository always filters role='coach' (user_roles_scope_check
  // guarantees user_id is always resolvable), but the mapper stays
  // defensive against a structurally-nullable embed rather than throw or
  // fabricate a name.
  it('returns null when the users embed is missing', () => {
    const dto: CoachAssignmentDto = { team_id: 'team-1', user_id: 'user-1', users: null }

    expect(toTeamCoachAssignment(dto)).toBeNull()
  })
})
