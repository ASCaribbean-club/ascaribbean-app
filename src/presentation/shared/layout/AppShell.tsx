import type { PropsWithChildren } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-full flex-col bg-coach-bg font-coach antialiased">
      {/* pb-24 alone, not stacked with env(safe-area-inset-bottom): BottomNav
          already shifts its own position up by that safe-area value, so
          adding it here too was double-counting and reserving more clearance
          than the nav actually occupies. */}
      <main className="flex-1 pb-24">{children ?? <Outlet />}</main>
      <BottomNav />
    </div>
  )
}
