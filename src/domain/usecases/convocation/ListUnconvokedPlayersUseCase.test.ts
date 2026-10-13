import { describe, expect, it } from 'vitest'
import type { ConvocationRespondersRepository } from '../../repositories/convocation-responders-repository'
import { ListUnconvokedPlayersUseCase } from './ListUnconvokedPlayersUseCase'

function repository(teamPlayers: string[], convokedIds: string[]): ConvocationRespondersRepository {
  return {
    listTeamPlayers: async () => teamPlayers.map((id) => ({ userId: id, displayName: id, position: null })),
    listForConvocation: async () => convokedIds.map((id) => ({ userId: id, displayName: id, hasResponded: false, position: null })),
  }
}

describe('ListUnconvokedPlayersUseCase', () => {
  it('returns the players of the team who are not convoked, alphabetically', async () => {
    const result = await new ListUnconvokedPlayersUseCase(repository(['d', 'a', 'c', 'b'], ['b', 'd'])).execute('c1')
    expect(result.map((player) => player.userId)).toEqual(['a', 'c'])
  })

  it('returns an empty list when everybody is already convoked', async () => {
    const result = await new ListUnconvokedPlayersUseCase(repository(['a', 'b'], ['a', 'b'])).execute('c1')
    expect(result).toEqual([])
  })

  it('ignores convoked ids that are no longer players of the team', async () => {
    const result = await new ListUnconvokedPlayersUseCase(repository(['a'], ['former'])).execute('c1')
    expect(result.map((player) => player.userId)).toEqual(['a'])
  })
})
