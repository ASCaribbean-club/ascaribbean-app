import { CoachDashboardPage } from '../features/coach-dashboard/CoachDashboardPage'
import { DirigeantDashboardPage } from '../features/dirigeant-dashboard/DirigeantDashboardPage'
import { PlayerDashboardPage } from '../features/player-dashboard/PlayerDashboardPage'
import { useActiveRole } from '../shared/hooks/use-active-role'

export function DashboardIndexPage() {
  const { activeRole, isOfficerView } = useActiveRole()
  // isOfficerView (not just activeRole): AC-DH-03 — a forced active role
  // without the real 'authorized-officer' assignment never reaches the
  // Dirigeant variant.
  if (isOfficerView) return <DirigeantDashboardPage />
  return activeRole === 'coach' ? <CoachDashboardPage /> : <PlayerDashboardPage />
}
