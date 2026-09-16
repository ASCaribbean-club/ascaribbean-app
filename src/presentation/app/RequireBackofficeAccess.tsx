import { Outlet } from 'react-router-dom'
import { can } from '@domain/policies/can'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { BackofficeAccessDeniedPage } from '@presentation/features/backoffice/access-denied/BackofficeAccessDeniedPage'

// AC-WE-09: a session that passed RequireBackofficeSession (a real
// Supabase session exists) but doesn't hold the right role renders
// BackofficeAccessDeniedPage INLINE, never a redirect back to
// /admin/login — bouncing an already-authenticated account back to the
// login screen would look like a broken loop, not a clear refusal.
//
// PO-WE-01 resolved to the spec's own default (specs/web-empty-state.md §2,
// "Position retenue pour cette passe — la plus étroite"): 'admin' only, via
// the 'backoffice:access' rbac-matrix entry (domain/policies/{actions,
// rbac-matrix}.ts). This is a front-end UX gate only, not security
// (CLAUDE.md §6, ARCHITECTURE.md §7) — it masks an empty shell, nothing
// this slice reads is protected by it. Widening to another role later is a
// rbac-matrix.ts change (and, per §2, a can.ts scope check if
// 'section-manager' is ever admitted) — not a change to this guard.
export function RequireBackofficeAccess() {
  // Safe: only reached through RequireBackofficeSession, which already
  // redirects to /admin/login when there's no user.
  const { user } = useAuth()
  const hasBackofficeAccess = can(user!, 'backoffice:access')

  if (!hasBackofficeAccess) return <BackofficeAccessDeniedPage />
  return <Outlet />
}
