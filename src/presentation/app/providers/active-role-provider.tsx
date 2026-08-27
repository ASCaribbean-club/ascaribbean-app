import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { useAuth } from '../../shared/hooks/use-auth'

export type DashboardRole = 'coach' | 'player'

interface ActiveRoleState {
  activeRole: DashboardRole
  toggleActiveRole: () => void
}

const ActiveRoleContext = createContext<ActiveRoleState | null>(null)

// Order matters: player-first, so a dual-role account defaults to the
// Player dashboard.
function getDashboardRoles(roles: { role: string }[]): DashboardRole[] {
  return (['player', 'coach'] as const).filter((role) => roles.some((assignment) => assignment.role === role))
}

export function ActiveRoleProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const dashboardRoles = useMemo(() => getDashboardRoles(user?.roles ?? []), [user])
  const [activeRole, setActiveRole] = useState<DashboardRole>(dashboardRoles[0] ?? 'player')

  const toggleActiveRole = () => {
    if (dashboardRoles.length <= 1) return
    setActiveRole((current) => {
      const nextIndex = (dashboardRoles.indexOf(current) + 1) % dashboardRoles.length
      return dashboardRoles[nextIndex]
    })
  }

  return <ActiveRoleContext.Provider value={{ activeRole, toggleActiveRole }}>{children}</ActiveRoleContext.Provider>
}

export function useActiveRoleContext(): ActiveRoleState {
  const context = useContext(ActiveRoleContext)
  if (!context) {
    throw new Error('useActiveRoleContext must be used within an ActiveRoleProvider')
  }
  return context
}
