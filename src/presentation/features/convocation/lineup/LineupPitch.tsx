import { getSlotPositions } from './lineup-layout'
import { PlayerToken } from './PlayerToken'
import type { Formation } from '@domain/entities/match-lineup'
import type { LineupSlotView } from './useMatchLineupViewModel'

interface LineupPitchProps {
  formation: Formation
  slots: LineupSlotView[]
  interactive: boolean
  selectedSlotIndex: number | null
  showEmptyHints: boolean
  onSelectSlot: (slotIndex: number) => void
}

// specs/coach-match-composition.md UI design §3 (source: mockups C1..C8) — dark
// green card, fixed 4/5 ratio so the percentage-positioned tokens hold their
// place at any phone width. The markings are decorative (aria-hidden).
export function LineupPitch({ formation, slots, interactive, selectedSlotIndex, showEmptyHints, onSelectSlot }: LineupPitchProps) {
  const positions = getSlotPositions(formation)

  return (
    <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl border border-white/10 bg-coach-green/30">
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-2xl border border-white/25" />
      <div aria-hidden className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-white/25" />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-1/5 top-3 h-1/6 rounded-b-xl border border-t-0 border-white/25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-1/5 bottom-3 h-1/6 rounded-t-xl border border-b-0 border-white/25"
      />

      {slots.map((slot) => (
        <PlayerToken
          key={slot.slotIndex}
          number={slot.number}
          name={slot.displayName}
          x={positions[slot.slotIndex].x}
          y={positions[slot.slotIndex].y}
          interactive={interactive}
          selected={selectedSlotIndex === slot.slotIndex}
          showEmptyHint={showEmptyHints}
          onSelect={() => onSelectSlot(slot.slotIndex)}
        />
      ))}
    </div>
  )
}
