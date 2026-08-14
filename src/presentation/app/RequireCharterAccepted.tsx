import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../shared/hooks/use-auth'

export function RequireCharterAccepted() {
  const { user } = useAuth()
  // Safe: only reached through RequireSession, which already redirects to
  // /login when there's no user.
  if (!user!.charterAcceptedAt) return <Navigate to="/charter" replace />
  return <Outlet />
}
