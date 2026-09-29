import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'

interface CurrentSeasonSelectProps {
  seasonLabel: string | undefined
}

// UI design §3 — "Sélecteur de saison... n'affiche que la saison courante et
// n'ouvre aucune liste déroulante d'autres saisons" (PO-CTS-03, not
// resolved: whether past-season history is even reachable is a security
// decision, not an display one — see that spec section for the full
// reasoning). Rendered as a real shadcn Select with exactly ONE option
// rather than a disabled-looking placeholder, so it reads as "this is the
// one season there is" rather than "this control is broken".
//
// `h-11` (CLAUDE.md §6) overriding shadcn's un-adjusted `h-8` default.
export function CurrentSeasonSelect({ seasonLabel }: CurrentSeasonSelectProps) {
  if (!seasonLabel) return null

  return (
    <Select value={seasonLabel} disabled>
      <SelectTrigger className="h-11 w-full rounded-xl border-white/15 bg-white/6 text-[13.5px] font-bold text-white disabled:opacity-100">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={seasonLabel}>Saison {seasonLabel}</SelectItem>
      </SelectContent>
    </Select>
  )
}
