import { useAuthDependencies } from '@presentation/di/hooks/use-auth-dependencies'

// specs/web-dashboard.md §2.6/AC-WD-20 — ZERO new use case, ZERO new
// permission: the same SignOutUseCase useMenuViewModel/useProfileViewModel
// already call, via the same DI hook. No `navigate()` here — RequireBackofficeSession
// redirects to /admin/login on its own once the session disappears
// (AC-WD-21), never to the mobile /login.
export function useBackofficeLogoutButton() {
  const { signOutUseCase } = useAuthDependencies()

  return {
    onLogout: () => {
      void signOutUseCase.execute()
    },
  }
}
