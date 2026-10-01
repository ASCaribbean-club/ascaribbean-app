import {
  FORMATIONS,
  LINEUP_SLOT_COUNT,
  type Formation,
  type LineupPlacement,
  type LineupSlots,
} from '../entities/match-lineup'

// specs/coach-match-composition.md §3 (PO-MC-01, PO-MC-12) — pure rules, no
// I/O. Mirrored MANUALLY in SQL (CLAUDE.md §7) by
// private.can_read_match_lineup in
// supabase/migrations/20261001075331_match_lineup.sql, rule name
// 'match_lineup:read-window' on both sides.

const FALLBACK_OPENING_OFFSET_MINUTES = 60

/**
 * Instant from which a PLAYER may see the lineup: the RDV time
 * (`meetingPointTime`), or — PO-MC-12 assumption, unconfirmed — kickoff minus
 * one hour when no RDV is set. The only place that fallback lives.
 */
export function getLineupOpeningTime(meetingPointTime: string | null, kickoff: string): Date {
  if (meetingPointTime) return new Date(meetingPointTime)
  const opening = new Date(kickoff)
  opening.setMinutes(opening.getMinutes() - FALLBACK_OPENING_OFFSET_MINUTES)
  return opening
}

/**
 * Whether the opening time comes from the fallback (no RDV) — drives the
 * waiting-message wording (never mention a rendez-vous that does not exist).
 */
export function isLineupOpeningFromFallback(meetingPointTime: string | null): boolean {
  return !meetingPointTime
}

/**
 * Strict comparison, same boundary semantics as isMatchResultRecordable: a
 * `now` exactly equal to the opening time is still "not yet". Coaches are
 * never subject to this window (PO-MC-02) — callers apply it to players only.
 */
export function isLineupVisibleToPlayer(meetingPointTime: string | null, kickoff: string, now: Date): boolean {
  return now > getLineupOpeningTime(meetingPointTime, kickoff)
}

export function isFormation(value: string): value is Formation {
  return (FORMATIONS as string[]).includes(value)
}

export function createEmptySlots(): LineupSlots {
  return Array.from({ length: LINEUP_SLOT_COUNT }, () => null)
}

// Persisted placements -> the fixed-length slot array the editing rules work on.
export function placementsToSlots(placements: LineupPlacement[]): LineupSlots {
  const slots = createEmptySlots()
  for (const placement of placements) {
    if (placement.slotIndex >= 0 && placement.slotIndex < LINEUP_SLOT_COUNT) slots[placement.slotIndex] = placement.userId
  }
  return slots
}

// Swap what two slots hold (AC-MC-05). A free slot is a valid target: the
// player simply moves there and their old slot becomes free (Q-UI-7).
export function swapSlots(slots: LineupSlots, a: number, b: number): LineupSlots {
  if (a === b || !isSlotIndex(a) || !isSlotIndex(b)) return slots
  const next = [...slots]
  next[a] = slots[b]
  next[b] = slots[a]
  return next
}

// Put a player on a slot (AC-MC-06 "Remplacer" / empty-slot picker). The
// previous occupant leaves the field. If the player is already placed
// elsewhere they are moved, never duplicated (AC-MC-07).
export function placePlayer(slots: LineupSlots, slotIndex: number, userId: string): LineupSlots {
  if (!isSlotIndex(slotIndex)) return slots
  const next = slots.map((id) => (id === userId ? null : id))
  next[slotIndex] = userId
  return next
}

// AC-MC-06 — convoked players NOT on the field. Order of the convoked list
// is preserved.
export function getAvailablePlayerIds(convokedPlayerIds: string[], slots: LineupSlots): string[] {
  const placed = new Set(slots.filter((id): id is string => id !== null))
  return convokedPlayerIds.filter((id) => !placed.has(id))
}

export function countEmptySlots(slots: LineupSlots): number {
  return slots.filter((id) => id === null).length
}

// Q-UI-8 — an incomplete lineup is saved, an entirely empty one is not.
export function hasAnyPlacedPlayer(slots: LineupSlots): boolean {
  return slots.some((id) => id !== null)
}

/**
 * The three invariants the database also holds (AC-MC-07): shape, one slot
 * per player, every placed player is convoked. Returns the first violation
 * message, or null when the draft is valid.
 */
export function findLineupViolation(formation: string, slots: LineupSlots, convokedPlayerIds: string[]): string | null {
  if (!isFormation(formation)) return 'Unknown formation.'
  if (slots.length !== LINEUP_SLOT_COUNT) return 'A lineup has exactly 11 slots.'
  const placed = slots.filter((id): id is string => id !== null)
  if (new Set(placed).size !== placed.length) return 'A player cannot occupy two slots.'
  const convoked = new Set(convokedPlayerIds)
  if (placed.some((id) => !convoked.has(id))) return 'A placed player must be convoked.'
  return null
}

function isSlotIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < LINEUP_SLOT_COUNT
}

// Whether a lineup tab applies at all (AC-MC-01): a match of a football team.
export function isLineupSupported(convocationType: string, sectionType: string | undefined): boolean {
  return convocationType === 'match' && sectionType === 'football'
}
