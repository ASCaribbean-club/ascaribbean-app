import type { ConvocationType } from '@domain/entities/convocation'
import { CONVOCATION_TYPE_ACCENT } from '@presentation/shared/formatters/convocation-type-accent'
import { cn } from '@presentation/shared/lib/utils'

interface EventTypeDotsProps {
  types: ConvocationType[]
  // The day cell that renders this is the tap target (AC-CA-19, "cible
  // tactile de la cellule entière") — the dots themselves are purely
  // decorative and stay aria-hidden, same reasoning as ResponseBar's own
  // colored segments (its adjacent <ul> carries the real text labels).
}

// UI design §"Structure de l'écran" point 2 — up to 3 colored dots per day
// cell (week strip or month grid), one per DISTINCT convocation type
// occurring that day, reusing CONVOCATION_TYPE_ACCENT verbatim ("déjà le
// code couleur du reste de l'app, rien à réinventer") rather than inventing
// a new palette. A 4th dot never renders — a compact "+" stands in for
// "more than 3" instead, since a day cell is only a few pixels wide
// (~50px at 375px viewport, AC-CA-19).
export function EventTypeDots({ types }: EventTypeDotsProps) {
  if (types.length === 0) return null

  const visible = types.slice(0, 3)
  const hasOverflow = types.length > 3

  return (
    <span aria-hidden className="flex items-center justify-center gap-0.5">
      {visible.map((type) => (
        <span key={type} className={cn('size-1.5 rounded-full', CONVOCATION_TYPE_ACCENT[type].rail)} />
      ))}
      {hasOverflow && <span className="text-[9px] leading-none font-bold text-white/60">+</span>}
    </span>
  )
}
