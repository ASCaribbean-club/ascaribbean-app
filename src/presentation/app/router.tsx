import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../shared/layout/AppShell'
import { LoginPage } from '../features/auth/login/LoginPage'
import { ForgotPasswordPage } from '../features/auth/forgot-password/ForgotPasswordPage'
import { UpdatePasswordPage } from '../features/auth/update-password/UpdatePasswordPage'
import { CharterPage } from '../features/auth/charter/CharterPage'
import { CoachDashboardPage } from '../features/coach-dashboard/CoachDashboardPage'
import { ActusPage } from '../features/actus/ActusPage'
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
              // this route always renders the Coach view.
              { index: true, element: <CoachDashboardPage /> },
              { path: 'actus', element: <ActusPage /> },
            ],
          },
        ],
      },
    ],
  },
])
