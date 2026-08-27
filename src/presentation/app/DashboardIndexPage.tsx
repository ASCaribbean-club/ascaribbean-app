import { CoachDashboardPage } from '../features/coach-dashboard/CoachDashboardPage'
import { PlayerDashboardPage } from '../features/player-dashboard/PlayerDashboardPage'
import { useActiveRole } from '../shared/hooks/use-active-role'

export function DashboardIndexPage() {
  const { activeRole } = useActiveRole()
  return activeRole === 'coach' ? <CoachDashboardPage /> : <PlayerDashboardPage />
}
