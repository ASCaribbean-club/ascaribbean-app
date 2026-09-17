import { Outlet } from 'react-router-dom'
import { BackofficeSidebar } from '@presentation/features/backoffice/components/BackofficeSidebar'
import { BackofficeTopBar } from '@presentation/features/backoffice/components/BackofficeTopBar'
import { useBackofficeDashboardViewModel } from './useBackofficeDashboardViewModel'

// The dashboard shell (`/admin`): top bar + sidebar are fixed chrome,
// <Outlet/> renders whichever of the 6 sub-routes (overview/users/sections/
// seasons/memberships/news) is currently active — the same "layout route
// wraps an Outlet" shape as the mobile AppShell
// (presentation/shared/layout/AppShell.tsx), a sidebar standing in for the
// bottom nav.
//
// 2026-09-17 developer decision: BackofficePageHeader ("Bonjour, {prénom}")
// used to render here unconditionally, above every <Outlet/> content — so it
// showed on Actus/Utilisateurs/etc. too, not just a dashboard-shaped screen.
// Moved into BackofficeOverviewPage itself, the new 'overview' nav
// destination — this layout no longer knows about that header at all.
//
// `dark` class here (and reused verbatim on BackofficeLoginPage/
// BackofficeAccessDeniedPage/BackofficeDesktopOnlyPage): shadcn's `.dark`
// palette (bg-background, bg-card, text-muted-foreground, border-border —
// see global.css) is ALREADY fully defined and unused anywhere else in this
// app today. Scoping it to this one class, at the root of each backoffice
// screen, gets a complete dark theme for free instead of inventing a third
// fixed palette next to auth-*/coach-* (CLAUDE.md §2's "override tokens at
// the call site" pattern, applied to an entire class rather than one
// utility at a time). The brand accents (logo mark, primary buttons) reuse
// the existing coach-green/coach-red tokens instead — same reasoning, no new
// tokens for those either.
export function BackofficeDashboardLayout() {
  const vm = useBackofficeDashboardViewModel()

  return (
    <div className="dark flex min-h-svh flex-col bg-background font-backoffice text-foreground antialiased">
      <BackofficeTopBar fullName={vm.fullName} initials={vm.initials} />
      <div className="flex flex-1">
        <BackofficeSidebar />
        <main className="flex flex-1 flex-col gap-6 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
