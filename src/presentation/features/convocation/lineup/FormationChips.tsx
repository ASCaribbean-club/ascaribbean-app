import { FORMATIONS, type Formation } from '@domain/entities/match-lineup'
import { cn } from '@presentation/shared/lib/utils'

interface FormationChipsProps {
  value: Formation
  onChange: (formation: Formation) => void
}

// specs/coach-match-composition.md UI design §3 — same pill pattern as
// TypeSelector/TypePill (single select, active = solid green). `h-11` touch
// target (mockups draw ~28px), `min-w-0` on each chip, aria-pressed so the
// active formation is not signalled by colour alone (AC-MC-19).
export function FormationChips({ value, onChange }: FormationChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-extrabold tracking-wider text-white/50 uppercase">Formation</p>
      <div className="flex flex-wrap gap-2">
        {FORMATIONS.map((formation) => {
          const selected = formation === value
          return (
            <button
              key={formation}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(formation)}
              className={cn(
                'inline-flex h-11 min-w-0 items-center justify-center rounded-full border px-4 text-sm font-bold transition-colors',
                selected ? 'border-transparent bg-coach-green text-white' : 'border-white/10 bg-white/6 text-white/70 hover:bg-white/10',
              )}
            >
              {formation}
            </button>
          )
        })}
      </div>
    </div>
  )
}
