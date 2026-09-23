import { Link } from 'react-router-dom'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { useMembershipsAndInvitationsAlert } from './useMembershipsAndInvitationsAlert'

// specs/web-dashboard.md §2.5 — bloc ALERTE 1, footer of BackofficeSidebar,
// chrome shared by all 7 destinations (not just /admin/overview). AC-WD-19
// — a count of 0 for BOTH adhésions and invitations means nothing to alert
// about: the whole block disappears, same rule as MembershipsNavBadge/
// UsersNavBadge (`if (count <= 0) return null`). AC-WD-27 — the word
// "ALERTE" itself carries the meaning, the red tint is decoration only,
// never the sole signal.
export function MembershipsAndInvitationsAlert() {
  const { membershipsCount, invitationsCount } = useMembershipsAndInvitationsAlert()
  if (membershipsCount <= 0 && invitationsCount <= 0) return null

  // PO-WD-01 (non tranché — position par défaut retenue) — the phrase names
  // two resources, the link is unique: '/admin/memberships', the first
  // resource named, resolved from BACKOFFICE_NAV_ITEMS (never a hardcoded
  // string, same discipline as DashboardStatCard's own destinations).
  const to = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'memberships')!.path

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-coach-red/35 bg-coach-red/10 p-3">
      <span className="text-[11px] font-bold tracking-wider text-coach-red uppercase">Alerte</span>
      <p className="text-xs text-foreground">
        {membershipsCount} adhésion{membershipsCount > 1 ? 's' : ''} et {invitationsCount} invitation{invitationsCount > 1 ? 's' : ''} à traiter
      </p>
      <Link to={to} className="text-xs font-semibold text-coach-red underline underline-offset-2">
        Traiter maintenant
      </Link>
    </div>
  )
}
