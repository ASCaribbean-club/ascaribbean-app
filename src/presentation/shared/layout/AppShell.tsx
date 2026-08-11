import type { PropsWithChildren } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <main className="app-shell__content">{children ?? <Outlet />}</main>
      <BottomNav />
    </div>
  )
}
