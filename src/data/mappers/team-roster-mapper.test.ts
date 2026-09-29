import { describe, expect, it } from 'vitest'
import type { TeamRosterPlayerDto } from '@data/dto/team-roster-dto'
import { toTeamRosterPlayer } from './team-roster-mapper'

describe('toTeamRosterPlayer', () => {
  it('maps snake_case RPC columns to the domain shape', () => {
    const dto: TeamRosterPlayerDto = { user_id: 'player-1', full_name: 'Joueur 1' }

    expect(toTeamRosterPlayer(dto)).toEqual({ userId: 'player-1', displayName: 'Joueur 1' })
  })
})
