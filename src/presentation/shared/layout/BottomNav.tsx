import { NavLink } from 'react-router-dom'

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
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.label} to={item.to} className="bottom-nav__item">
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
