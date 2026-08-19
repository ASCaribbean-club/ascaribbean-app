import { NavLink } from 'react-router-dom'
import { cn } from '../lib/utils'

// 4 entrées fixes, établies par specs/coach-dashboard.md ("établit ce
// pattern pour ce premier écran du projet, à réutiliser tel quel"). Dashboard
// et Actus sont câblés (coach-dashboard, respectivement stub PO-1) ;
// Calendrier et Menu restent des cibles à câbler quand ces features
// atterrissent.
const NAV_ITEMS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Calendrier', to: '/' },
  { label: 'Actus', to: '/actus' },
  { label: 'Menu', to: '/' },
] as const

export function BottomNav() {
  return (
    <nav className="fixed right-8 bottom-5 left-8 z-20 flex rounded-full border border-white/10 bg-white/6 shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          className={({ isActive }) =>
            cn('flex-1 py-2.5 text-center text-[11px] font-semibold text-white/45', isActive && 'text-white')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
