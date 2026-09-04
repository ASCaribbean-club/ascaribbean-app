import type { DocumentStatus } from '@domain/entities/document'
import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'

interface DocumentStatusBadgeProps {
  status: DocumentStatus
}

const STATUS_LABEL: Record<DocumentStatus, string> = {
  valid: 'Valide',
  pending_validation: 'En attente de validation',
  rejected: 'Refusée',
  missing: 'Manquante',
}

// UI design §"Bloc documents" + "Questions ouvertes UI" #2 — a FIRST
// PROPOSAL, not a confirmed palette: avoids the coach-green/coach-red pair
// already reserved for présent/absent (spec §6 reminder), reuses the amber
// accent already established elsewhere for "en attente"
// (ResponderStatusBadge's binary variant, specs/match_details_page.md
// correction #9). Every state is always doubled by its text label
// (AC-PR-17) — there is no icon-only or color-only rendering path here,
// only the exact tints below remain to be confirmed with the developer.
//
// TODO: confirm `valid` and `rejected`'s tints specifically (spec's
// "Questions ouvertes UI" #2 names both as open) — `pending_validation` and
// `missing` reuse tokens already established elsewhere in the app, so
// they're lower-risk than these two.
const STATUS_CLASSNAME: Record<DocumentStatus, string> = {
  valid: 'border-sky-400/35 bg-sky-400/15 text-sky-300',
  pending_validation: 'border-coach-amber/35 bg-coach-amber/15 text-coach-amber',
  rejected: 'border-border bg-white/5 text-white/80',
  missing: 'border-white/12 bg-white/8 text-white/60',
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  return (
    <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap', STATUS_CLASSNAME[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
