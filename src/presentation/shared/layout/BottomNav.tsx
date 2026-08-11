import { NavLink } from 'react-router-dom'

// Cibles réelles à câbler au fur et à mesure que les features
// (dashboard, calendrier, recherche, menu) atterrissent.
const NAV_ITEMS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Calendrier', to: '/' },
  { label: 'Recherche', to: '/' },
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
