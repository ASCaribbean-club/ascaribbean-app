import { useCallback, useState } from 'react'
import { getFirstName, getInitials } from '@presentation/shared/formatters/greeting'
import { useAuth } from '@presentation/shared/hooks/use-auth'

const SIDEBAR_COLLAPSED_KEY = 'backoffice.sidebarCollapsed'

// Per-device UI preference only — localStorage can throw or be empty (private
// window, blocked site data), so every access is guarded and the sidebar just
// defaults to expanded.
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

// No queryFn here (AC-WE-12 — the shell never queries anything) and no use
// case call site to wire either: everything this screen needs is already on
// the signed-in User from useAuth() (presentation/shared/hooks/use-auth.ts),
// same pattern as useCoachDashboardViewModel/usePlayerDashboardViewModel.
export function useBackofficeDashboardViewModel() {
  const { user } = useAuth()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readCollapsed)

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((previous) => {
      const next = !previous
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // Preference just won't persist.
      }
      return next
    })
  }, [])

  return {
    fullName: user?.fullName ?? '',
    firstName: user ? getFirstName(user.fullName) : '',
    initials: user ? getInitials(user.fullName) : '',
    isSidebarCollapsed,
    toggleSidebar,
  }
}
