import { IconPlus } from '@tabler/icons-react'
import { cn } from '@presentation/shared/lib/utils'

interface PlayerTokenProps {
  number: number
  // null = free slot
  name: string | null
  // Position on the pitch card, in percent.
  x: number
  y: number
  interactive: boolean
  selected: boolean
  // Coach views label a free slot ("+" and "Libre"); the player view only
  // draws a plain dashed circle (UI design §7).
  showEmptyHint: boolean
  onSelect: () => void
}

// specs/coach-match-composition.md UI design §3/§7 — one token of the pitch.
// The visible circle stays small (as in the mockups) but the whole button
// offers a 44x44 touch zone (`min-h-11 min-w-11`, CLAUDE.md §6). Selection and
// emptiness are never carried by colour alone (AC-MC-19): aria-pressed, the
// "Libre" label and the "+" icon, plus the action panel repeating the name.
export function PlayerToken({ number, name, x, y, interactive, selected, showEmptyHint, onSelect }: PlayerTokenProps) {
  const isEmpty = name === null

  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          'flex size-8 items-center justify-center rounded-full text-sm font-extrabold',
          isEmpty ? 'border-2 border-dashed border-white/60 bg-transparent text-white/80' : 'bg-white text-black',
          selected && 'ring-4 ring-coach-green',
        )}
      >
        {isEmpty ? showEmptyHint && <IconPlus className="size-4" /> : number}
      </span>
      {(!isEmpty || showEmptyHint) && (
        <span className="max-w-18 truncate text-xs font-semibold text-white drop-shadow">{isEmpty ? 'Libre' : name}</span>
      )}
    </>
  )

  const className = 'absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5'
  const style = { left: `${x}%`, top: `${y}%` }

  if (!interactive) {
    return (
      <div className={className} style={style}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={isEmpty ? `Poste ${number} libre` : `${name}, poste ${number}`}
      onClick={onSelect}
      className={cn(className, 'rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white')}
      style={style}
    >
      {content}
    </button>
  )
}
