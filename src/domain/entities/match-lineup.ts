// specs/coach-match-composition.md §1 — the coach's choice of who starts and
// where. A THIRD fact, never merged with ConvocationResponse (declared
// intent) or AttendanceRecord (confirmed fact) — CLAUDE.md §6. A
// "current state" entity: last value wins, one lineup per convocation.

export type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1'

// AC-MC-04 — exactly these four presets, definition owned by the domain
// (screen coordinates are presentation's concern).
export const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1']

// PO-MC-09 — football at 11 only.
export const LINEUP_SLOT_COUNT = 11

// PO-MC-07 — a token's number is the slot index + 1, not a jersey number.
// Slot 0 is the goalkeeper; the following slots fill each outfield line
// described below, left to right, from the defence up to the attack.
export const FORMATION_LINES: Record<Formation, number[]> = {
  '4-3-3': [4, 3, 3],
  '4-4-2': [4, 4, 2],
  '3-5-2': [3, 5, 2],
  '4-2-3-1': [4, 2, 3, 1],
}

// One entry per slot (always LINEUP_SLOT_COUNT long): the placed player's
// user id, or null for a free slot. Because the slot INDEX is what is
// persisted, changing formation keeps everybody in the lineup (AC-MC-04).
export type LineupSlots = (string | null)[]

export interface LineupPlacement {
  slotIndex: number
  userId: string
  displayName: string
}

export interface MatchLineup {
  convocationId: string
  formation: Formation
  placements: LineupPlacement[]
}
