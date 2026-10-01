import { describe, expect, it } from 'vitest'
import { FORMATIONS, LINEUP_SLOT_COUNT } from '@domain/entities/match-lineup'
import { getSlotPositions } from './lineup-layout'

describe('getSlotPositions', () => {
  it.each(FORMATIONS)('places exactly 11 slots for %s', (formation) => {
    expect(getSlotPositions(formation)).toHaveLength(LINEUP_SLOT_COUNT)
  })

  it('puts the goalkeeper alone at the bottom centre', () => {
    const [goalkeeper, ...rest] = getSlotPositions('4-3-3')
    expect(goalkeeper.x).toBe(50)
    expect(rest.every((position) => position.y < goalkeeper.y)).toBe(true)
  })

  it('spreads a line of three symmetrically', () => {
    const positions = getSlotPositions('4-3-3')
    // slots 5-7 are the midfield line of a 4-3-3
    expect(positions[5].x).toBe(25)
    expect(positions[6].x).toBe(50)
    expect(positions[7].x).toBe(75)
  })

  it('stacks lines further up for a four-line formation', () => {
    const positions = getSlotPositions('4-2-3-1')
    const striker = positions[10]
    expect(striker.x).toBe(50)
    expect(striker.y).toBeLessThan(positions[1].y)
  })
})
