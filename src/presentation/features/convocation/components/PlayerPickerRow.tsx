import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'
import { cn } from '@presentation/shared/lib/utils'

interface PlayerPickerRowProps {
  name: string
  selected: boolean
  onSelect: () => void
}

// specs/match-stats.md UI design §3/§5 — one selectable row of the
// BUTEURS/CARTONS picker's eligible-player list (MatchResultScorerPicker/
// MatchResultCardPicker). Single-selection radio semantics — the caller
// (useConvocationDetailViewModel's `matchResult` section) tracks exactly
// one selected id at a time.
// `h-11` minimum touch target (CLAUDE.md §6) via the row's own min-height.
export function PlayerPickerRow({ name, selected, onSelect }: PlayerPickerRowProps) {
  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cn(
          'flex min-h-11 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
          selected ? 'border-coach-green bg-coach-green/12' : 'border-white/10 bg-white/5 hover:bg-white/8',
        )}
      >
        <InitialsAvatar name={name} />
        <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-white">{name}</p>
      </button>
    </li>
  )
}
