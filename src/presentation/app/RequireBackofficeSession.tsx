import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@presentation/shared/hooks/use-auth'

// Mirrors RequireSession.tsx exactly, ONE difference: redirects to
// /admin/login, never /login (AC-WE-08 — "jamais vers la connexion
// mobile"). Kept as its own component rather than a parameterized
// RequireSession(redirectTo) — see RequireBackofficeAccess.tsx, the next
// guard in this chain, which genuinely can't be shared with anything on the
// mobile side, so there was no pressure to force this one into a shared
// shape either.
export function RequireBackofficeSession() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/admin/login" replace />
  return <Outlet />
}
