import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useActiveTeam } from '@presentation/shared/hooks/use-active-team'
import { useAuth } from '@presentation/shared/hooks/use-auth'

// The team whose availability list the current session would read: the
// player's own team for the player active role, the coach's selected (else
// first) team for the coach active role. `undefined` when the account has no
// such assignment. Only a lookup — the permission decision stays with
// can('availability:read-team', { teamId }).
export function useAvailabilityTeamId(): string | undefined {
  const { user } = useAuth()
  const { activeRole } = useActiveRole()
  const { selectedCoachTeamId } = useActiveTeam()

  if (!user) return undefined

  if (activeRole === 'coach') {
    const coach = user.roles.find((assignment) => assignment.role === 'coach')
    if (!coach) return undefined
    return selectedCoachTeamId && coach.teamIds.includes(selectedCoachTeamId) ? selectedCoachTeamId : coach.teamIds[0]
  }

  const player = user.roles.find((assignment) => assignment.role === 'player')
  return player?.teamId
}
