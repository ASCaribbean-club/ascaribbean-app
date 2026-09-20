import { userStatus, type UserStatus } from '@domain/policies/user-status'
import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'

interface UserStatusBadgeProps {
  charterAcceptedAt: Date | null
}

// specs/web-users.md §2.1/AC-WU-08/UI design "Nouveau composant —
// UserStatusBadge" — `charterAcceptedAt` is the raw fact, userStatus() (the
// SAME pure domain predicate the row/badge share, never a second inline
// test) derives the two-value status HERE, at render time — this component
// never receives an already-computed UserStatus so there is no second place
// that could drift from the domain's own rule (AC-WU-08's own "jamais
// recalculé en ligne dans un composant" reads as "never hand-rolled here",
// not "never called here").
const STATUS_LABEL: Record<UserStatus, string> = {
  invited: 'Invité',
  active: 'Actif',
}

// Same family/tints as MembershipStatusBadge ('active') and the amber
// treatment already used for 'pending'/'upcoming' elsewhere in this
// backoffice — reused, not invented (§2.1 UI design).
const STATUS_CLASSNAME: Record<UserStatus, string> = {
  active: 'border-green-400/35 bg-green-400/35 text-green-300',
  invited: 'border-coach-amber/35 bg-coach-amber/15 text-coach-amber',
}

// AC-WU-28 — always paired with its text label, never color alone.
export function UserStatusBadge({ charterAcceptedAt }: UserStatusBadgeProps) {
  const status = userStatus(charterAcceptedAt)
  return (
    <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap', STATUS_CLASSNAME[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
