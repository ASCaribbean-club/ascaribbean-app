import { describe, expect, it } from 'vitest'
import { OpponentMapper } from './opponent-mapper'

describe('OpponentMapper', () => {
  it('maps an opponents row (also the add_opponent_to_team RPC return) to an Opponent', () => {
    expect(OpponentMapper.toDomain({ id: 'opponent-1', name: 'AS Exemple' })).toEqual({ id: 'opponent-1', name: 'AS Exemple' })
  })

  it('keeps the name verbatim, without trimming or case changes', () => {
    expect(OpponentMapper.toDomain({ id: 'opponent-2', name: ' as Exemple ' }).name).toBe(' as Exemple ')
  })
})
