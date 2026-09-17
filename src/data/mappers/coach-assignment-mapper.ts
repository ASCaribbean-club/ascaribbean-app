import type { TeamCoachAssignment } from '@domain/repositories/coach-repository'
import type { CoachAssignmentDto } from '@data/dto/coach-assignment-dto'

// specs/section-and-teams.md §2.11/AC-ST-41 — a row with no matching `users`
// embed (should not happen per the DTO's own comment, but PostgREST embeds
// are structurally nullable) is dropped rather than mapped with a made-up
// name — CoachRepositoryImpl.listAllAssignments() filters these out before
// they ever reach the ViewModel (see that method's own comment).
export function toTeamCoachAssignment(dto: CoachAssignmentDto): TeamCoachAssignment | null {
  if (!dto.users) return null
  return {
    teamId: dto.team_id,
    coach: {
      id: dto.user_id,
      fullName: dto.users.full_name,
    },
  }
}
