import { useRef, useState } from 'react'
import { useAuthDependencies } from '@presentation/di/hooks/use-auth-dependencies'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useAvailabilityTeamId } from '@presentation/shared/hooks/use-availability-team-id'
import { usePermission } from '@presentation/shared/hooks/use-permission'

// specs/menu.md §1/§2 — the Menu adds ZERO use cases, ZERO repositories,
// ZERO rbac-matrix entries of its own (§2 "Aucune entrée de matrice, aucune
// action nouvelle"). It reuses SignOutUseCase for the logout button — same
// one useProfileViewModel.ts already calls from its own `onLogout`, via the
// same DI hook (belongs to the auth feature, not a new `menu-container.ts`).
const DOUBLE_TAP_WINDOW_MS = 400

export function useMenuViewModel() {
  const { signOutUseCase } = useAuthDependencies()
  const { activeRole, isOfficerView } = useActiveRole()
  const availabilityTeamId = useAvailabilityTeamId()
  const canReadTeamAvailability = usePermission('availability:read-team', { teamId: availabilityTeamId })

  // specs/mobile-treasurer.md §3 — 'dues:read' (treasurer, authorized-officer,
  // admin): the Cotisations card is absent, never greyed out, without it.
  const canViewDues = usePermission('dues:read')

  const [isChangelogOpen, setIsChangelogOpen] = useState(false)
  const lastVersionTapAt = useRef(0)

  // Two taps within DOUBLE_TAP_WINDOW_MS open the changelog. Timed by hand
  // rather than with onDoubleClick, which mobile browsers don't fire reliably
  // (double-tap-to-zoom handling).
  const onVersionTap = () => {
    const now = Date.now()
    if (now - lastVersionTapAt.current <= DOUBLE_TAP_WINDOW_MS) {
      lastVersionTapAt.current = 0
      setIsChangelogOpen(true)
    } else {
      lastVersionTapAt.current = now
    }
  }

  return {
    onLogout: () => signOutUseCase.execute(),

    // specs/player-unavailability.md §1/UI design §1 — UX only; the RPC is the
    // real boundary.
    canReadTeamAvailability,
    canViewDues,

    // specs/coach-team-stats.md PO-CTS-06 — the "Statistiques" card now
    // branches on the dashboard's active role: a coach reaches their own
    // team-stats screen (/team-stats), everyone else keeps the existing
    // player-stats destination (/stats). No RBAC check here — same reason
    // MenuNavCard itself has none (AC-PS-15): the destination screen does
    // its own can() gate.
    // The Dirigeant habilité has neither a player nor a team-stats screen:
    // the card is absent for that role (never greyed out).
    canViewStatistics: !isOfficerView,
    statisticsHref: activeRole === 'coach' ? '/team-stats' : '/stats',

    // AC-MN-09 — `APP_VERSION` is a Vite `define` (vite.config.ts) fed by
    // package.json's version at build time, typed in src/vite-env.d.ts.
    // Never a hardcoded string: the mockup's "2.4.1" was mockup copy, not
    // a value to reproduce (specs/menu.md §1 point 4).
    appVersion: APP_VERSION,
    onVersionTap,
    isChangelogOpen,
    setIsChangelogOpen,
  }
}
