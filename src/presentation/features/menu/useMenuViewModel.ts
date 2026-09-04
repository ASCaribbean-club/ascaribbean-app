import { useAuthDependencies } from '@presentation/di/hooks/use-auth-dependencies'

// specs/menu.md §1/§2 — the Menu adds ZERO use cases, ZERO repositories,
// ZERO rbac-matrix entries of its own (§2 "Aucune entrée de matrice, aucune
// action nouvelle"). It reuses SignOutUseCase for the logout button — same
// one useProfileViewModel.ts already calls from its own `onLogout`, via the
// same DI hook (belongs to the auth feature, not a new `menu-container.ts`).
export function useMenuViewModel() {
  const { signOutUseCase } = useAuthDependencies()

  return {
    onLogout: () => signOutUseCase.execute(),

    // AC-MN-09 — `APP_VERSION` is a Vite `define` (vite.config.ts) fed by
    // package.json's version at build time, typed in src/vite-env.d.ts.
    // Never a hardcoded string: the mockup's "2.4.1" was mockup copy, not
    // a value to reproduce (specs/menu.md §1 point 4).
    appVersion: APP_VERSION,
  }
}
