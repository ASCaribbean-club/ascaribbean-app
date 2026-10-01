import { FORMATION_LINES, type Formation } from '@domain/entities/match-lineup'

export interface SlotPosition {
  // Percentages of the pitch card, so tokens keep their place at any phone
  // width (the card has a fixed aspect ratio).
  x: number
  y: number
}

const GOALKEEPER_Y = 88
const ATTACK_Y = 14

// specs/coach-match-composition.md UI design §3 — screen coordinates are a
// presentation concern; the definition of the four presets (how many players
// per line) is the domain's (FORMATION_LINES). Returns one position per slot
// index: slot 0 is the goalkeeper (bottom), then each line from the defence
// up to the attack, left to right.
export function getSlotPositions(formation: Formation): SlotPosition[] {
  const lines = [1, ...FORMATION_LINES[formation]]
  const step = (GOALKEEPER_Y - ATTACK_Y) / (lines.length - 1)

  return lines.flatMap((count, lineIndex) => {
    const y = GOALKEEPER_Y - lineIndex * step
    return Array.from({ length: count }, (_, i) => ({ x: ((i + 1) / (count + 1)) * 100, y }))
  })
}
