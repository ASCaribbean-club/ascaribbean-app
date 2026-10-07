import { Badge } from '@presentation/shared/components/ui/badge'

// specs/finances-member-advances.md AC-FA-19 — the archived state is carried by
// this TEXT, never by dimming or colour alone. Same neutral classes as
// TrainingLocationArchivedBadge.
export function FinanceCarrierArchivedBadge() {
  return (
    <Badge className="rounded-full border-white/15 bg-white/10 px-2.5 py-1 text-xs font-extrabold tracking-wide text-white/70 uppercase">
      Archivé
    </Badge>
  )
}
