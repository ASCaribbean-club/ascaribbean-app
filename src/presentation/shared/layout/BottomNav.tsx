import { NavLink } from 'react-router-dom'
import { IconLayoutDashboard, IconCalendarEvent, IconBell, IconMenu2 } from '@tabler/icons-react'
import { cn } from '../lib/utils'

// 4 entrées fixes, établies par specs/coach-dashboard.md
const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: IconLayoutDashboard },
  { label: 'Calendrier', to: '/calendar', icon: IconCalendarEvent },
  { label: 'Actus', to: '/actus', icon: IconBell },
  { label: 'Menu', to: '/menu', icon: IconMenu2 },
] as const

export function BottomNav() {
  return (
    <nav
      className="fixed right-4 bottom-[0.8rem] p-2 left-4 z-20 flex rounded-full border border-white/10 bg-white/6 shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-sm"
      role="tablist"
      aria-label="Navigation principale"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group flex flex-1 flex-col items-center justify-center gap-0 py-1 text-center transition-all',
                'text-white/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                isActive && 'text-white'
              )
            }
            role="tab"
            aria-label={item.label}
          >
            <Icon
              size={18}
              strokeWidth={1.5}
              className="transition-transform group-active:scale-95"
              aria-hidden="true"
            />
            <span className="text-[0.7rem] font-semibold">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
