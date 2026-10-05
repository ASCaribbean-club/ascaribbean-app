import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { useAuth } from '../../shared/hooks/use-auth'

// 'player' / 'coach' / 'authorized-officer' — a section-manager/admin
// account (none of these roles) never gets a dashboard tab here, so it can
// never reach a screen gated by useActiveRole() (e.g. the convocation
// detail screen). Pre-existing, app-wide gap, tracked as
// specs/match_details_page.md §"Questions ouvertes UI" #1 (PO-CA-06 /
// PO-MN-07 stay open for the other roles). 'authorized-officer' was added by
// specs/mobile-dirigeant-habilite.md; it is the structural twin of
// domain/rules/active-role-scope.ts's ActiveDashboardRole and both MUST be
// changed together (AC-DH-04).
// 'treasurer' was added by specs/mobile-treasurer.md in the same change as
// ActiveDashboardRole (AC-TR-03).
export type DashboardRole = 'coach' | 'player' | 'authorized-officer' | 'treasurer'

interface ActiveRoleState {
  activeRole: DashboardRole
  // Distinct dashboard roles the account holds, in switch order.
  dashboardRoles: DashboardRole[]
  setActiveRole: (role: DashboardRole) => void
  toggleActiveRole: () => void
  // True only when the account really holds 'authorized-officer' AND that is
  // the active dashboard role — AC-DH-03: forcing `activeRole` without the
  // role never reaches the Dirigeant variants.
  isOfficerView: boolean
  // Same guarantee for the Trésorier view (AC-TR-02): forcing `activeRole`
  // without really holding 'treasurer' never reaches it.
  isTreasurerView: boolean
  // At least two distinct dashboard roles: the role pill is a real switch.
  hasMultipleDashboardRoles: boolean
}

const ActiveRoleContext = createContext<ActiveRoleState | null>(null)

// Order matters: player-first, so a dual-role account defaults to the
// Player dashboard. Switch order: joueur -> coach -> dirigeant -> trésorier (PO-DH-08,
// PO-TR-05, defaults retained). An officer-only account opens on the Dirigeant view.
function getDashboardRoles(roles: { role: string }[]): DashboardRole[] {
  return (['player', 'coach', 'authorized-officer', 'treasurer'] as const).filter((role) => roles.some((assignment) => assignment.role === role))
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

  const isOfficerView = activeRole === 'authorized-officer' && dashboardRoles.includes('authorized-officer')

  const isTreasurerView = activeRole === 'treasurer' && dashboardRoles.includes('treasurer')

  return (
    <ActiveRoleContext.Provider
      value={{ activeRole, dashboardRoles, setActiveRole, toggleActiveRole, isOfficerView, isTreasurerView, hasMultipleDashboardRoles: dashboardRoles.length > 1 }}
    >
      {children}
    </ActiveRoleContext.Provider>
  )
}

export function useActiveRoleContext(): ActiveRoleState {
  const context = useContext(ActiveRoleContext)
  if (!context) {
    throw new Error('useActiveRoleContext must be used within an ActiveRoleProvider')
  }
  return context
}
