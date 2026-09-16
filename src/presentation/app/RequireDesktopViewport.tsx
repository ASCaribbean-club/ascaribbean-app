import { Outlet } from 'react-router-dom'
import { BackofficeDesktopOnlyPage } from '@presentation/features/backoffice/desktop-gate/BackofficeDesktopOnlyPage'
import { useDesktopViewport } from '@presentation/features/backoffice/shared/hooks/use-desktop-viewport'

// PO-WE-09 (specs/web-empty-state.md §5 + "Garde de largeur desktop"):
// gates the ENTIRE /admin* subtree, login screen included — AC-WE-18
// doesn't carve out an exception for it, and the spec is explicit that a
// CSS-only `hidden lg:block` would still let the login form's JS run
// pointlessly on a phone, which is why this is a React-level gate rather
// than a Tailwind breakpoint class.
export function RequireDesktopViewport() {
  const isDesktop = useDesktopViewport()
  if (!isDesktop) return <BackofficeDesktopOnlyPage />
  return <Outlet />
}
