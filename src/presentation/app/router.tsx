import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../shared/layout/AppShell'
import { LoginPage } from '../features/auth/login/LoginPage'
import { ForgotPasswordPage } from '../features/auth/forgot-password/ForgotPasswordPage'
import { UpdatePasswordPage } from '../features/auth/update-password/UpdatePasswordPage'
import { CharterPage } from '../features/auth/charter/CharterPage'
import { ActusPage } from '../features/actus/ActusPage'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { MenuPage } from '../features/menu/MenuPage'
import { CreateConvocationForm } from '../features/convocation/CreateConvocationForm'
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
            // PO-2 (specs/coach-dashboard.md) / PO-PD-01 (specs/player-dashboard.md):
            // the role pill is now wired for real — ActiveRoleProvider tracks
            // which of the user's dashboard-capable roles (coach/player) is
            // active, and DashboardIndexPage renders accordingly. Defaults to
            // Player for a dual-role account.
            element: (
              <ActiveRoleProvider>
                <AppShell />
              </ActiveRoleProvider>
            ),
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
        ],
      },
    ],
  },
])
