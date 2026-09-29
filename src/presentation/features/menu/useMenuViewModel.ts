import { useAuthDependencies } from '@presentation/di/hooks/use-auth-dependencies'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'

// specs/menu.md §1/§2 — the Menu adds ZERO use cases, ZERO repositories,
// ZERO rbac-matrix entries of its own (§2 "Aucune entrée de matrice, aucune
// action nouvelle"). It reuses SignOutUseCase for the logout button — same
// one useProfileViewModel.ts already calls from its own `onLogout`, via the
// same DI hook (belongs to the auth feature, not a new `menu-container.ts`).
export function useMenuViewModel() {
  const { signOutUseCase } = useAuthDependencies()
  const { activeRole } = useActiveRole()

  return {
    onLogout: () => signOutUseCase.execute(),

    // specs/coach-team-stats.md PO-CTS-06 — the "Statistiques" card now
    // branches on the dashboard's active role: a coach reaches their own
    // team-stats screen (/team-stats), everyone else keeps the existing
    // player-stats destination (/stats). No RBAC check here — same reason
    // MenuNavCard itself has none (AC-PS-15): the destination screen does
    // its own can() gate.
    statisticsHref: activeRole === 'coach' ? '/team-stats' : '/stats',

    // AC-MN-09 — `APP_VERSION` is a Vite `define` (vite.config.ts) fed by
    // package.json's version at build time, typed in src/vite-env.d.ts.
    // Never a hardcoded string: the mockup's "2.4.1" was mockup copy, not
    // a value to reproduce (specs/menu.md §1 point 4).
    appVersion: APP_VERSION,
  }
}
