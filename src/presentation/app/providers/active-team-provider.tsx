import { createContext, useContext, useState, type PropsWithChildren } from 'react'

// Coach-only, sibling concept to ActiveRoleProvider (active-role-provider.tsx)
// rather than folded into it: a player never has more than one team (single
// `teamId` on their role assignment, §1 "sélecteur d'équipe" hors périmètre
// everywhere a player screen touches it), so this only ever matters for the
// coach role. Deliberately holds ONLY the selected id, not the team list
// itself or any query — each ViewModel that needs "the coach's teams" still
// runs its own getCoachTeamsUseCase query (already shared via the same
// queryKeys.coachTeams(user.id) cache key between useCoachDashboardViewModel
// and useCalendarViewModel) and resolves `currentTeam` by looking this id up
// in ITS OWN query result, falling back to the first team when nothing has
// been explicitly selected yet — same "first team by array order" default
// as before (PO-6/PO-CA-05), just now overridable instead of fixed.
interface ActiveTeamState {
  selectedCoachTeamId: string | null
  selectCoachTeam: (teamId: string) => void
}

const ActiveTeamContext = createContext<ActiveTeamState | null>(null)

export function ActiveTeamProvider({ children }: PropsWithChildren) {
  const [selectedCoachTeamId, setSelectedCoachTeamId] = useState<string | null>(null)

  return (
    <ActiveTeamContext.Provider value={{ selectedCoachTeamId, selectCoachTeam: setSelectedCoachTeamId }}>
      {children}
    </ActiveTeamContext.Provider>
  )
}

export function useActiveTeamContext(): ActiveTeamState {
  const context = useContext(ActiveTeamContext)
  if (!context) {
    throw new Error('useActiveTeamContext must be used within an ActiveTeamProvider')
  }
  return context
}
