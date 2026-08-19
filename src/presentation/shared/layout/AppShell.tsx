import type { PropsWithChildren } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-svh flex-col bg-coach-bg font-coach antialiased">
      <main className="flex-1 pb-24">{children ?? <Outlet />}</main>
      <BottomNav />
    </div>
  )
}
