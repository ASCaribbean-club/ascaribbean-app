import { describe, expect, it } from 'vitest'
import { ConvocationResponderMapper, ConvocationTeamPlayerMapper } from './convocation-responder-mapper'

describe('ConvocationTeamPlayerMapper', () => {
  it('maps a team player, with and without a position', () => {
    expect(ConvocationTeamPlayerMapper.toDomain({ user_id: 'u1', display_name: 'Joueur', position: 'goalkeeper' })).toEqual({
      userId: 'u1',
      displayName: 'Joueur',
      position: 'goalkeeper',
    })
    expect(ConvocationTeamPlayerMapper.toDomain({ user_id: 'u2', display_name: 'Autre', position: null }).position).toBeNull()
  })
})

describe('ConvocationResponderMapper', () => {
  it('keeps the binary hasResponded and never a status', () => {
    const result = ConvocationResponderMapper.toDomain({ user_id: 'u1', display_name: 'Joueur', has_responded: true, position: null })
    expect(result).toEqual({ userId: 'u1', hasResponded: true, displayName: 'Joueur', position: null })
  })
})
