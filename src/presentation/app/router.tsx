import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../shared/layout/AppShell'

// TODO: wrap protected routes with an auth guard once the Authentification
// module lands (redirect to /login when there is no active session).
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
  },
])
