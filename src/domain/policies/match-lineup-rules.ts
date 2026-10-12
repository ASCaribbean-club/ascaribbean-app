import {
  FORMATIONS,
  LINEUP_SLOT_COUNT,
  MAX_JERSEY_NUMBER,
  MIN_JERSEY_NUMBER,
  type Formation,
  type LineupJerseyNumbers,
  type LineupPlacement,
  type LineupSlots,
} from '../entities/match-lineup'

// specs/coach-match-composition.md §3 (PO-MC-01, PO-MC-12) — pure rules, no
// I/O. Mirrored MANUALLY in SQL (CLAUDE.md §7) by
// private.can_read_match_lineup in
// supabase/migrations/20261001075331_match_lineup.sql, rule name
// 'match_lineup:read-window' on both sides.

const OPENING_OFFSET_HOURS = 24

/**
 * Instant from which a PLAYER may see the lineup: kickoff minus 24 hours,
 * whatever the RDV time is. The only place that offset lives.
 */
export function getLineupOpeningTime(kickoff: string): Date {
  // Absolute milliseconds, not setHours: a DST change must not shift the
  // window away from SQL's `interval '24 hours'`.
  return new Date(new Date(kickoff).getTime() - OPENING_OFFSET_HOURS * 3_600_000)
}

/**
 * Strict comparison, same boundary semantics as isMatchResultRecordable: a
 * `now` exactly equal to the opening time is still "not yet". Coaches are
 * never subject to this window (PO-MC-02) — callers apply it to players only.
 */
export function isLineupVisibleToPlayer(kickoff: string, now: Date): boolean {
  return now > getLineupOpeningTime(kickoff)
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
export function findLineupViolation(
  formation: string,
  slots: LineupSlots,
  convokedPlayerIds: string[],
  jerseyNumbers: LineupJerseyNumbers = {},
): string | null {
  if (!isFormation(formation)) return 'Unknown formation.'
  if (slots.length !== LINEUP_SLOT_COUNT) return 'A lineup has exactly 11 slots.'
  const placed = slots.filter((id): id is string => id !== null)
  if (new Set(placed).size !== placed.length) return 'A player cannot occupy two slots.'
  const convoked = new Set(convokedPlayerIds)
  if (placed.some((id) => !convoked.has(id))) return 'A placed player must be convoked.'
  // AC-MC-29 — a placed player's number is null or an integer 1..99.
  if (placed.some((id) => !isValidJerseyNumber(jerseyNumbers[id] ?? null))) {
    return `A jersey number must be an integer between ${MIN_JERSEY_NUMBER} and ${MAX_JERSEY_NUMBER}.`
  }
  return null
}

/**
 * Rule 'jersey-number:range' (PO-MC-15) — null (no number) or an integer in
 * 1..99. Mirrored MANUALLY by the check constraints on
 * memberships.jersey_number and match_lineup_slots.jersey_number in
 * supabase/migrations/20261012125515_match_jersey_number.sql. No unicity
 * (PO-MC-14).
 */
export function isValidJerseyNumber(value: number | null): boolean {
  if (value === null) return true
  return Number.isInteger(value) && value >= MIN_JERSEY_NUMBER && value <= MAX_JERSEY_NUMBER
}

export type JerseyNumberInput = { ok: true; value: number | null } | { ok: false; message: string }

/**
 * Text field -> number. Blank = no number (valid, AC-MC-29); anything that is
 * not a whole number in range is rejected with a readable message.
 */
export function parseJerseyNumberInput(raw: string): JerseyNumberInput {
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: true, value: null }
  const message = `Entrez un nombre entier entre ${MIN_JERSEY_NUMBER} et ${MAX_JERSEY_NUMBER}.`
  if (!/^\d+$/.test(trimmed)) return { ok: false, message }
  const value = Number(trimmed)
  return isValidJerseyNumber(value) ? { ok: true, value } : { ok: false, message }
}

/**
 * Soft warning only (PO-MC-14: no unicity constraint) — whether another PLACED
 * player already wears this number in the draft.
 */
export function hasDuplicateJerseyNumber(
  slots: LineupSlots,
  jerseyNumbers: LineupJerseyNumbers,
  userId: string,
  value: number | null,
): boolean {
  if (value === null) return false
  return slots.some((id) => id !== null && id !== userId && jerseyNumbers[id] === value)
}

/**
 * AC-MC-26 / PO-MC-16 — number prefilled when a player is selected: the
 * membership number of the convocation's season. `defaults` already holds
 * only that season's numbers (the repository resolves "season containing the
 * convocation date"; none -> nothing); a missing or out-of-range entry gives
 * null so the field is simply empty and editable (AC-MC-29). Mirrored in
 * get_lineup_default_jersey_numbers (SQL).
 */
export function getPrefilledJerseyNumber(defaults: Record<string, number | null>, userId: string): number | null {
  const value = defaults[userId] ?? null
  return isValidJerseyNumber(value) ? value : null
}

// Persisted placements -> the per-player numbers the editing rules work on.
export function placementsToJerseyNumbers(placements: LineupPlacement[]): LineupJerseyNumbers {
  const numbers: LineupJerseyNumbers = {}
  for (const placement of placements) numbers[placement.userId] = placement.jerseyNumber
  return numbers
}

function isSlotIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < LINEUP_SLOT_COUNT
}

// Whether a lineup tab applies at all (AC-MC-01): a match of a football team.
export function isLineupSupported(convocationType: string, sectionType: string | undefined): boolean {
  return convocationType === 'match' && sectionType === 'football'
}
