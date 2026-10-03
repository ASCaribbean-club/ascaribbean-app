import { Link } from 'react-router-dom'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { IconAlertTriangle } from '@tabler/icons-react'
import { SidebarTooltip } from './SidebarTooltip'
import { useMembershipsAndInvitationsAlert } from './useMembershipsAndInvitationsAlert'

// specs/web-dashboard.md §2.5 — bloc ALERTE 1, footer of BackofficeSidebar,
// chrome shared by all 7 destinations (not just /admin/overview). AC-WD-19
// — a count of 0 for BOTH adhésions and invitations means nothing to alert
// about: the whole block disappears, same rule as MembershipsNavBadge/
// UsersNavBadge (`if (count <= 0) return null`). AC-WD-27 — the word
// "ALERTE" itself carries the meaning, the red tint is decoration only,
// never the sole signal.
interface MembershipsAndInvitationsAlertProps {
  isCollapsed?: boolean
}

export function MembershipsAndInvitationsAlert({ isCollapsed = false }: MembershipsAndInvitationsAlertProps) {
  const { membershipsCount, invitationsCount } = useMembershipsAndInvitationsAlert()
  if (membershipsCount <= 0 && invitationsCount <= 0) return null

  // PO-WD-01 (non tranché — position par défaut retenue) — the phrase names
  // two resources, the link is unique: '/admin/memberships', the first
  // resource named, resolved from BACKOFFICE_NAV_ITEMS (never a hardcoded
  // string, same discipline as DashboardStatCard's own destinations).
  const to = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'memberships')!.path

  const message = `${membershipsCount} adhésion${membershipsCount > 1 ? 's' : ''} et ${invitationsCount} invitation${invitationsCount > 1 ? 's' : ''} à traiter`

  // Collapsed: icon + total count badge, the whole thing is the link.
  if (isCollapsed) {
    return (
      <SidebarTooltip enabled label={`Alerte : ${message}`}>
        <Link
          to={to}
          aria-label={`Alerte : ${message}`}
          className="relative flex size-11 items-center justify-center self-center rounded-lg border border-coach-red/35 bg-coach-red/10 text-coach-red"
        >
          <IconAlertTriangle className="size-4.5" aria-hidden />
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coach-red px-1.5 text-[11px] font-bold text-white">
            {membershipsCount + invitationsCount}
          </span>
        </Link>
      </SidebarTooltip>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-coach-red/35 bg-coach-red/10 p-3">
      <span className="text-[11px] font-bold tracking-wider text-coach-red uppercase">Alerte</span>
      <p className="text-xs text-foreground">{message}</p>
      <Link to={to} className="text-xs font-semibold text-coach-red underline underline-offset-2">
        Traiter maintenant
      </Link>
    </div>
  )
}
