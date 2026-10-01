import { describe, expect, it } from 'vitest'
import type { MatchLineupSlotDto } from '../dto/match-lineup-dto'
import { toMatchLineup, toSaveSlotsPayload } from './match-lineup-mapper'

const dto = (slot_index: number, user_id: string, formation = '4-3-3'): MatchLineupSlotDto => ({
  formation,
  slot_index,
  user_id,
  display_name: `Player ${user_id}`,
})

describe('match-lineup-mapper', () => {
  it('maps no rows to null', () => {
    expect(toMatchLineup('c1', [])).toBeNull()
  })

  it('maps rows to a lineup with placements sorted by slot', () => {
    expect(toMatchLineup('c1', [dto(4, 'b'), dto(0, 'a')])).toEqual({
      convocationId: 'c1',
      formation: '4-3-3',
      placements: [
        { slotIndex: 0, userId: 'a', displayName: 'Player a' },
        { slotIndex: 4, userId: 'b', displayName: 'Player b' },
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
      { slot_index: 0, user_id: 'a' },
      { slot_index: 7, user_id: 'b' },
    ])
  })

  it('serializes an empty lineup to an empty payload', () => {
    expect(toSaveSlotsPayload(Array(11).fill(null))).toEqual([])
  })
})
