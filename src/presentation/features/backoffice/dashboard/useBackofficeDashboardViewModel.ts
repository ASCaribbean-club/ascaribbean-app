import { getFirstName, getInitials } from '@presentation/shared/formatters/greeting'
import { useAuth } from '@presentation/shared/hooks/use-auth'

// No queryFn here (AC-WE-12 — the shell never queries anything) and no use
// case call site to wire either: everything this screen needs is already on
// the signed-in User from useAuth() (presentation/shared/hooks/use-auth.ts),
// same pattern as useCoachDashboardViewModel/usePlayerDashboardViewModel.
export function useBackofficeDashboardViewModel() {
  const { user } = useAuth()

  return {
    fullName: user?.fullName ?? '',
    firstName: user ? getFirstName(user.fullName) : '',
    initials: user ? getInitials(user.fullName) : '',
  }
}
