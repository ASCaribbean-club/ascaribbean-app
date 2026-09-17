import type { SeasonStatus } from '@domain/policies/season-scope'
import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'

interface SeasonStatusBadgeProps {
  status: SeasonStatus
}

// specs/web-seasons.md UI design, "Nouveau composant SeasonStatusBadge" —
// `status` is the ALREADY-COMPUTED result of seasonStatus(season, now)
// (AC-WS-12) — this component never re-derives it from a Season row itself
// (AC-WS-18).
//
// PO-WS-01 (non-blocking, §6/§7 of the spec): the three labels below
// reproduce §2.2's own state table verbatim, the most defensible fallback in
// the absence of any visual reference for "ended"/"upcoming" (the mockup
// only shows "En cours") — to confirm with the developer/Bureau before this
// screen is considered final, not silently settled here.
const STATUS_LABEL: Record<SeasonStatus, string> = {
  current: 'En cours',
  ended: 'Terminée',
  upcoming: 'À venir',
}

// Colors extend the vocabulary already established elsewhere rather than
// inventing a new one: "ended" reuses StatusBadge's neutral "Clôturée"
// treatment (neither positive nor negative, a season that's simply over),
// "upcoming" reuses MembershipStatusBadge/DocumentStatusBadge's amber
// "pending" treatment (not started yet, not a success or a failure either).
const STATUS_CLASSNAME: Record<SeasonStatus, string> = {
  current: 'border-coach-green/35 bg-coach-green/15 text-coach-green-text',
  ended: 'border-white/15 bg-white/10 text-white/70',
  upcoming: 'border-coach-amber/35 bg-coach-amber/15 text-coach-amber',
}

// AC-WS-29 — the status is never conveyed by color alone, the text label
// always accompanies the badge.
export function SeasonStatusBadge({ status }: SeasonStatusBadgeProps) {
  return (
    <Badge className={cn('rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide uppercase', STATUS_CLASSNAME[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
