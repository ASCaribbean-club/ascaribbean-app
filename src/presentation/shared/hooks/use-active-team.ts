import { useActiveTeamContext } from '../../app/providers/active-team-provider'

export function useActiveTeam() {
  return useActiveTeamContext()
}
