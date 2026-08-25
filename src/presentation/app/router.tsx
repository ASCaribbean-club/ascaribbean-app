import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../shared/layout/AppShell'
import { LoginPage } from '../features/auth/login/LoginPage'
import { ForgotPasswordPage } from '../features/auth/forgot-password/ForgotPasswordPage'
import { UpdatePasswordPage } from '../features/auth/update-password/UpdatePasswordPage'
import { CharterPage } from '../features/auth/charter/CharterPage'
import { CoachDashboardPage } from '../features/coach-dashboard/CoachDashboardPage'
import { ActusPage } from '../features/actus/ActusPage'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { MenuPage } from '../features/menu/MenuPage'
import { CreateConvocationForm } from '../features/convocation/CreateConvocationForm'
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
            element: <AppShell />,
            children: [
              // Coach's dashboard is the default landing screen — see
              // specs/coach-dashboard.md "Emplacement dans la nav". Not
              // role-branched here (PO-2 role switching is a no-op in v1):
              // this route always renders the Coach view for now.
              { index: true, element: <CoachDashboardPage /> },
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
