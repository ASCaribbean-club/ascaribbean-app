import { useRef } from 'react'
import { IconPlus } from '@tabler/icons-react'
import { cn } from '@presentation/shared/lib/utils'

// Press duration (ms) that turns a tap into "edit this player's number".
const LONG_PRESS_MS = 500
const NO_NUMBER_FALLBACK = '–'

interface PlayerTokenProps {
  // Slot position (index + 1), only used to name a free slot.
  position: number
  // Effective jersey number for this match (PO-MC-07), null = none (AC-MC-25).
  jerseyNumber: number | null
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
  // Edit mode, placed player: opens number editing without selecting.
  onLongPress: () => void
}

// specs/coach-match-composition.md UI design §3/§7 — one token of the pitch.
// The visible circle stays small (as in the mockups) but the whole button
// offers a 44x44 touch zone (`min-h-11 min-w-11`, CLAUDE.md §6). Selection and
// emptiness are never carried by colour alone (AC-MC-19): aria-pressed, the
// "Libre" label and the "+" icon, plus the action panel repeating the name.
export function PlayerToken({
  position,
  jerseyNumber,
  name,
  x,
  y,
  interactive,
  selected,
  showEmptyHint,
  onSelect,
  onLongPress,
}: PlayerTokenProps) {
  const isEmpty = name === null
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  function cancelPress() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  function startPress() {
    if (isEmpty) return
    longPressed.current = false
    cancelPress()
    timer.current = setTimeout(() => {
      longPressed.current = true
      timer.current = null
      onLongPress()
    }, LONG_PRESS_MS)
  }
  function handleClick() {
    // The click that ends a long press must not also select/swap.
    if (longPressed.current) {
      longPressed.current = false
      return
    }
    onSelect()
  }

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
        {isEmpty ? showEmptyHint && <IconPlus className="size-4" /> : (jerseyNumber ?? NO_NUMBER_FALLBACK)}
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
      aria-label={
        isEmpty ? `Poste ${position} libre` : jerseyNumber === null ? `${name}, sans numéro` : `${name}, numéro ${jerseyNumber}`
      }
      onClick={handleClick}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(event) => event.preventDefault()}
      className={cn(className, 'select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white')}
      style={style}
    >
      {content}
    </button>
  )
}
