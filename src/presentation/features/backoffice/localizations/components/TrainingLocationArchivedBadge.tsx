import { Badge } from '@presentation/shared/components/ui/badge'

// specs/web-localizations.md AC-WL-13 — the archived state is carried by
// this TEXT, never by color or dimming alone. Same neutral classes as
// SeasonStatusBadge's "Terminée".
export function TrainingLocationArchivedBadge() {
  return (
    <Badge className="rounded-full border-white/15 bg-white/10 px-2.5 py-1 text-xs font-extrabold tracking-wide text-white/70 uppercase">
      Archivé
    </Badge>
  )
}
