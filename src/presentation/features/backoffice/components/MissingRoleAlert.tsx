import { Link } from 'react-router-dom'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { formatNameList } from '@presentation/shared/formatters/name-list'
import { useMissingRoleAlert } from './useMissingRoleAlert'

const usersPath = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'users')!.path

// specs/web-dashboard.md §2.5 — bloc ALERTE 2, footer of BackofficeSidebar.
// AC-WD-17/AC-WD-18 — counts ONLY `missingElementFacts.hasRole === false`,
// never `hasMissingElement()`'s four-criteria OR: this number legitimately
// differs from the red badge on "Utilisateurs" (which DOES count all four),
// and the two are never reconciled. AC-WD-19 — hidden entirely at 0, same
// rule as the two nav badges. AC-WD-26 — every name comes from
// usersAdminDirectory() at render time, never hardcoded.
export function MissingRoleAlert() {
  const { count, names } = useMissingRoleAlert()
  if (count <= 0) return null

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-coach-amber/35 bg-coach-amber/10 p-3">
      <span className="text-[11px] font-bold tracking-wider text-coach-amber uppercase">Alerte</span>
      <p className="text-xs text-foreground">
        {count} utilisateur{count > 1 ? 's' : ''} sans rôle assigné : {formatNameList(names)}
      </p>
      <Link to={usersPath} className="text-xs font-semibold text-coach-amber underline underline-offset-2">
        Voir les utilisateurs
      </Link>
    </div>
  )
}
