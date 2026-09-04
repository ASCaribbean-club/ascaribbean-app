import type { MembershipStatus } from '@domain/entities/membership'
import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'

interface MembershipStatusBadgeProps {
  status: MembershipStatus
}

const STATUS_LABEL: Record<MembershipStatus, string> = {
  pending: 'En attente',
  active: 'Active',
  suspended: 'Suspendue',
}

// Same "never reuse the coach-green/coach-red présent/absent vocabulary"
// precaution as DocumentStatusBadge (specs/profile-page.md §6 reminder) —
// active mirrors that component's `valid` tint, pending mirrors
// `pending_validation`'s amber, suspended mirrors `rejected`'s low-saturation
// neutral rather than an alarming red. Always paired with its text label
// (AC-PR-17), never color alone.
const STATUS_CLASSNAME: Record<MembershipStatus, string> = {
  pending: 'border-coach-amber/35 bg-coach-amber/15 text-coach-amber',
  active: 'border-green-400/35 bg-green-400/35 text-green-300',
  suspended: 'border-border bg-white/5 text-white/80',
}

export function MembershipStatusBadge({ status }: MembershipStatusBadgeProps) {
  return (
    <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap', STATUS_CLASSNAME[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
