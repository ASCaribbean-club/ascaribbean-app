import { createBrowserRouter, Outlet } from 'react-router-dom'
import { AppShell } from '../shared/layout/AppShell'
import { LoginPage } from '../features/auth/login/LoginPage'
import { ForgotPasswordPage } from '../features/auth/forgot-password/ForgotPasswordPage'
import { UpdatePasswordPage } from '../features/auth/update-password/UpdatePasswordPage'
import { CharterPage } from '../features/auth/charter/CharterPage'
import { ActusPage } from '../features/actus/ActusPage'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { MenuPage } from '../features/menu/MenuPage'
import { CreateConvocationForm } from '../features/convocation/CreateConvocationForm'
import { ConvocationDetailPage } from '../features/convocation/ConvocationDetailPage'
import { ActiveRoleProvider } from './providers/active-role-provider'
import { DashboardIndexPage } from './DashboardIndexPage'
import { RequireSession } from './RequireSession'
import { RequireCharterAccepted } from './RequireCharterAccepted'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  // Not behind RequireSession: it must render its own "invalid/expired
  // link" state for a rejected recovery link, which never produces a
  // session for RequireSession to gate on. See useUpdatePasswordViewModel.
  { path: '/update-password', element: <UpdatePasswordPage /> },
  {
    path: '/',
    element: <RequireSession />,
    children: [
      { path: '/charter', element: <CharterPage /> },
      {
        element: <RequireCharterAccepted />,
        children: [
          {
            // specs/match_details_page.md, "Emplacement dans la nav"
            // (resolution): ActiveRoleProvider now wraps every
            // authenticated + charter-accepted route, not just the AppShell
            // branch — convocations/new and convocations/:id need
            // useActiveRole() too (the latter uses it to decide which
            // variant, player or coach, to render). This is a thin
            // Outlet-only layer so convocations/new and convocations/:id can
            // sit inside ActiveRoleProvider's scope as siblings of the
            // AppShell branch below, without being nested UNDER AppShell
            // (they must stay chrome-less, no BottomNav). AppShell itself is
            // untouched — it still renders its own <Outlet/> for its own
            // children. Placement change only — zero behavior change to how
            // ActiveRoleProvider computes or persists the active role.
            element: (
              <ActiveRoleProvider>
                <Outlet />
              </ActiveRoleProvider>
            ),
            children: [
              {
                // PO-2 (specs/coach-dashboard.md) / PO-PD-01 (specs/player-dashboard.md):
                // the role pill is now wired for real — ActiveRoleProvider tracks
                // which of the user's dashboard-capable roles (coach/player) is
                // active, and DashboardIndexPage renders accordingly. Defaults to
                // Player for a dual-role account.
                element: <AppShell />,
                children: [
                  { index: true, element: <DashboardIndexPage /> },
                  { path: 'calendar', element: <CalendarPage /> },
                  { path: 'actus', element: <ActusPage /> },
                  { path: 'menu', element: <MenuPage /> },
                ],
              },
              // specs/create-convocation.md UI design, "Emplacement dans la
              // nav": a full-screen route pushed OVER one of the 4 tabs, no
              // bottom-nav chrome — deliberately NOT nested under AppShell
              // (which always renders BottomNav, see shared/layout/AppShell.tsx).
              // Reached only via CreateConvocationFab today (coach-dashboard);
              // a future Calendrier "+" would push this same element (§7).
              { path: 'convocations/new', element: <CreateConvocationForm /> },
              // specs/match_details_page.md UI design, "Emplacement dans la
              // nav": second child of the same full-screen-over-tabs group as
              // convocations/new above, NOT a 5th BottomNav destination —
              // reachable by direct URL (AC-MD-01 covers the "not found/out of
              // scope" case), not only by an onOpen callback. PO-MD-06 (wiring
              // NextConvocationCard.onOpen / NextTrainingOrMatchCard.onOpen /
              // UpcomingConvocationList/UpcomingList's onOpen to actually
              // navigate here) stays explicitly open/non-blocking for the coach
              // side — see the TODO already in place on
              // useCoachDashboardViewModel.goToConvocationDetail, not touched
              // by this pass. usePlayerDashboardViewModel.goToConvocationDetail
              // now navigates here for real. Now inside ActiveRoleProvider's scope
              // (see above), so useConvocationDetailViewModel can read
              // useActiveRole() to pick the player/coach variant.
              { path: 'convocations/:id', element: <ConvocationDetailPage /> },
            ],
          },
        ],
      },
    ],
  },
])
