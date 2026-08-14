import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../shared/hooks/use-auth'

export function RequireSession() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
