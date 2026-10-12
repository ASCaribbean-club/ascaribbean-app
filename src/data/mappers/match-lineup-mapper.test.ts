import { describe, expect, it } from 'vitest'
import type { MatchLineupSlotDto } from '../dto/match-lineup-dto'
import { toDefaultJerseyNumbers, toMatchLineup, toSaveSlotsPayload } from './match-lineup-mapper'

const dto = (slot_index: number, user_id: string, formation = '4-3-3', jersey_number: number | null = null): MatchLineupSlotDto => ({
  formation,
  slot_index,
  user_id,
  display_name: `Player ${user_id}`,
  jersey_number,
})

describe('match-lineup-mapper', () => {
  it('maps no rows to null', () => {
    expect(toMatchLineup('c1', [])).toBeNull()
  })

  it('maps rows to a lineup with placements sorted by slot', () => {
    expect(toMatchLineup('c1', [dto(4, 'b', '4-3-3', 9), dto(0, 'a')])).toEqual({
      convocationId: 'c1',
      formation: '4-3-3',
      placements: [
        { slotIndex: 0, userId: 'a', displayName: 'Player a', jerseyNumber: null },
        { slotIndex: 4, userId: 'b', displayName: 'Player b', jerseyNumber: 9 },
      ],
    })
  })

  it('treats an unknown stored formation as no lineup', () => {
    expect(toMatchLineup('c1', [dto(0, 'a', '9-9-9')])).toBeNull()
  })

  it('serializes only occupied slots for the save payload', () => {
    const slots = Array(11).fill(null)
    slots[0] = 'a'
    slots[7] = 'b'
    expect(toSaveSlotsPayload(slots)).toEqual([
      { slot_index: 0, user_id: 'a', jersey_number: null },
      { slot_index: 7, user_id: 'b', jersey_number: null },
    ])
  })

  it('serializes an empty lineup to an empty payload', () => {
    expect(toSaveSlotsPayload(Array(11).fill(null))).toEqual([])
  })

  it('maps a missing or out-of-range stored number to null (AC-MC-25)', () => {
    const lineup = toMatchLineup('c1', [dto(0, 'a', '4-3-3', 0), { ...dto(1, 'b'), jersey_number: undefined as unknown as null }])
    expect(lineup?.placements.map((placement) => placement.jerseyNumber)).toEqual([null, null])
  })

  it('writes each placed player number in the save payload, only for placed slots (AC-MC-27)', () => {
    const slots = Array(11).fill(null)
    slots[2] = 'a'
    expect(toSaveSlotsPayload(slots, { a: 10, z: 5 })).toEqual([{ slot_index: 2, user_id: 'a', jersey_number: 10 }])
  })

  it('maps default-number rows to a record keyed by player, dropping invalid values', () => {
    expect(
      toDefaultJerseyNumbers([
        { user_id: 'a', jersey_number: 10 },
        { user_id: 'b', jersey_number: 0 },
      ]),
    ).toEqual({ a: 10 })
  })
})
