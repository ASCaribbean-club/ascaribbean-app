import { CoachDashboardPage } from '../features/coach-dashboard/CoachDashboardPage'
import { DirigeantDashboardPage } from '../features/dirigeant-dashboard/DirigeantDashboardPage'
import { TreasurerDashboardPage } from '../features/treasurer/dashboard/TreasurerDashboardPage'
import { PlayerDashboardPage } from '../features/player-dashboard/PlayerDashboardPage'
import { useActiveRole } from '../shared/hooks/use-active-role'

export function DashboardIndexPage() {
  const { activeRole, isOfficerView, isTreasurerView } = useActiveRole()
  // isOfficerView (not just activeRole): AC-DH-03 — a forced active role
  // without the real 'authorized-officer' assignment never reaches the
  // Dirigeant variant.
  if (isOfficerView) return <DirigeantDashboardPage />
  // AC-TR-01/AC-TR-02 — same guard for the Trésorier view.
  if (isTreasurerView) return <TreasurerDashboardPage />
  return activeRole === 'coach' ? <CoachDashboardPage /> : <PlayerDashboardPage />
}
