import { IconDeviceDesktopOff } from '@tabler/icons-react'
import { BackofficeBrandMark } from '@presentation/features/backoffice/components/BackofficeBrandMark'

// PO-WE-09 default proposal (specs/web-empty-state.md §5 + "Garde de
// largeur desktop"): rendered by RequireDesktopViewport
// (presentation/app/RequireDesktopViewport.tsx) for BOTH /admin/login and
// /admin below the desktop threshold — "un écran de repli unique,
// réutilisable pour /admin/login et /admin." This component doesn't know
// or need to know which of the two was requested, by design: the spec
// rules out any partial/truncated render below the threshold, so there's
// nothing route-specific left to show.
//
// Copy is a placeholder, not a decided string — PO-WE-09 stays open on both
// the exact wording and the width value itself (see
// shared/hooks/use-desktop-viewport.ts for the latter).
export function BackofficeDesktopOnlyPage() {
  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center font-backoffice text-foreground antialiased">
      <BackofficeBrandMark subtitle="" />
      <IconDeviceDesktopOff className="size-10 text-muted-foreground" aria-hidden />
      <p className="max-w-sm text-sm text-muted-foreground">Le backoffice AS Caribbean est disponible sur ordinateur.</p>
    </div>
  )
}
