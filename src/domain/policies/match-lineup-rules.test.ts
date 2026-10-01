import { describe, expect, it } from 'vitest'
import {
  countEmptySlots,
  createEmptySlots,
  findLineupViolation,
  getAvailablePlayerIds,
  getLineupOpeningTime,
  hasAnyPlacedPlayer,
  isFormation,
  isLineupOpeningFromFallback,
  isLineupSupported,
  isLineupVisibleToPlayer,
  placePlayer,
  placementsToSlots,
  swapSlots,
} from './match-lineup-rules'

const KICKOFF = '2026-10-10T15:00:00.000Z'
const RDV = '2026-10-10T13:30:00.000Z'

describe('isLineupVisibleToPlayer (PO-MC-01)', () => {
  it('is hidden before the RDV', () => {
    expect(isLineupVisibleToPlayer(RDV, KICKOFF, new Date('2026-10-10T13:29:59.000Z'))).toBe(false)
  })

  it('is still hidden exactly at the RDV (strict comparison)', () => {
    expect(isLineupVisibleToPlayer(RDV, KICKOFF, new Date(RDV))).toBe(false)
  })

  it('is visible right after the RDV', () => {
    expect(isLineupVisibleToPlayer(RDV, KICKOFF, new Date('2026-10-10T13:30:00.001Z'))).toBe(true)
  })

  it('re-hides when the RDV is moved later (evaluated on the current value)', () => {
    const now = new Date('2026-10-10T13:45:00.000Z')
    expect(isLineupVisibleToPlayer(RDV, KICKOFF, now)).toBe(true)
    expect(isLineupVisibleToPlayer('2026-10-10T14:00:00.000Z', KICKOFF, now)).toBe(false)
  })

  it('falls back to kickoff minus one hour when there is no RDV (PO-MC-12)', () => {
    expect(isLineupVisibleToPlayer(null, KICKOFF, new Date('2026-10-10T13:59:59.000Z'))).toBe(false)
    expect(isLineupVisibleToPlayer(null, KICKOFF, new Date('2026-10-10T14:00:00.000Z'))).toBe(false)
    expect(isLineupVisibleToPlayer(null, KICKOFF, new Date('2026-10-10T14:00:00.001Z'))).toBe(true)
  })
})

describe('getLineupOpeningTime / isLineupOpeningFromFallback', () => {
  it('returns the RDV when set', () => {
    expect(getLineupOpeningTime(RDV, KICKOFF).toISOString()).toBe(RDV)
    expect(isLineupOpeningFromFallback(RDV)).toBe(false)
  })

  it('returns kickoff - 1h when there is no RDV', () => {
    expect(getLineupOpeningTime(null, KICKOFF).toISOString()).toBe('2026-10-10T14:00:00.000Z')
    expect(isLineupOpeningFromFallback(null)).toBe(true)
  })
})

describe('isLineupSupported (AC-MC-01)', () => {
  it('is true only for a football match', () => {
    expect(isLineupSupported('match', 'football')).toBe(true)
    expect(isLineupSupported('training', 'football')).toBe(false)
    expect(isLineupSupported('meeting', 'football')).toBe(false)
    expect(isLineupSupported('match', 'esport')).toBe(false)
    expect(isLineupSupported('match', undefined)).toBe(false)
  })
})

describe('isFormation (AC-MC-04)', () => {
  it('accepts exactly the four presets', () => {
    for (const f of ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1']) expect(isFormation(f)).toBe(true)
    expect(isFormation('5-3-2')).toBe(false)
  })
})

describe('slot operations', () => {
  function slotsWith(entries: Record<number, string>) {
    const slots = createEmptySlots()
    for (const [index, id] of Object.entries(entries)) slots[Number(index)] = id
    return slots
  }

  it('creates 11 empty slots', () => {
    const slots = createEmptySlots()
    expect(slots).toHaveLength(11)
    expect(countEmptySlots(slots)).toBe(11)
    expect(hasAnyPlacedPlayer(slots)).toBe(false)
  })

  it('swaps two placed players without duplicating or emptying (AC-MC-05)', () => {
    const next = swapSlots(slotsWith({ 0: 'a', 1: 'b' }), 0, 1)
    expect(next[0]).toBe('b')
    expect(next[1]).toBe('a')
    expect(countEmptySlots(next)).toBe(9)
  })

  it('moves a player onto a free slot, freeing the old one (Q-UI-7)', () => {
    const next = swapSlots(slotsWith({ 0: 'a' }), 0, 5)
    expect(next[0]).toBeNull()
    expect(next[5]).toBe('a')
  })

  it('does not mutate its input and ignores same/out-of-range indices', () => {
    const slots = slotsWith({ 0: 'a' })
    expect(swapSlots(slots, 0, 0)).toBe(slots)
    expect(swapSlots(slots, 0, 11)).toBe(slots)
    expect(swapSlots(slots, -1, 0)).toBe(slots)
    swapSlots(slots, 0, 1)
    expect(slots[0]).toBe('a')
  })

  it('places a player on a free slot', () => {
    const next = placePlayer(createEmptySlots(), 3, 'a')
    expect(next[3]).toBe('a')
  })

  it('replaces the occupant, who leaves the field (AC-MC-06)', () => {
    const next = placePlayer(slotsWith({ 3: 'a' }), 3, 'b')
    expect(next[3]).toBe('b')
    expect(next).not.toContain('a')
  })

  it('moves a player already placed elsewhere instead of duplicating (AC-MC-07)', () => {
    const next = placePlayer(slotsWith({ 3: 'a' }), 5, 'a')
    expect(next[3]).toBeNull()
    expect(next[5]).toBe('a')
  })

  it('lists convoked players not on the field, in convoked order', () => {
    expect(getAvailablePlayerIds(['a', 'b', 'c'], slotsWith({ 0: 'b' }))).toEqual(['a', 'c'])
  })
})

describe('findLineupViolation (AC-MC-07)', () => {
  const convoked = ['a', 'b', 'c']
  const slotsOf = (ids: (string | null)[]) => [...ids, ...Array(11 - ids.length).fill(null)]

  it('accepts a valid, incomplete lineup', () => {
    expect(findLineupViolation('4-3-3', slotsOf(['a', 'b']), convoked)).toBeNull()
  })

  it('rejects an unknown formation', () => {
    expect(findLineupViolation('9-9-9', slotsOf(['a']), convoked)).not.toBeNull()
  })

  it('rejects a wrong slot count', () => {
    expect(findLineupViolation('4-3-3', ['a'], convoked)).not.toBeNull()
  })

  it('rejects the same player on two slots', () => {
    expect(findLineupViolation('4-3-3', slotsOf(['a', 'a']), convoked)).not.toBeNull()
  })

  it('rejects a player who is not convoked', () => {
    expect(findLineupViolation('4-3-3', slotsOf(['a', 'z']), convoked)).not.toBeNull()
  })
})

describe('placementsToSlots', () => {
  it('projects placements onto 11 slots, leaving the others free', () => {
    const slots = placementsToSlots([
      { slotIndex: 0, userId: 'a', displayName: 'A' },
      { slotIndex: 10, userId: 'b', displayName: 'B' },
    ])
    expect(slots).toHaveLength(11)
    expect(slots[0]).toBe('a')
    expect(slots[10]).toBe('b')
    expect(countEmptySlots(slots)).toBe(9)
  })

  it('ignores an out-of-range slot index', () => {
    expect(countEmptySlots(placementsToSlots([{ slotIndex: 11, userId: 'a', displayName: 'A' }]))).toBe(11)
  })
})
