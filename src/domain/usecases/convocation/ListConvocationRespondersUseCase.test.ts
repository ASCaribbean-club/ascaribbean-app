import { describe, expect, it } from 'vitest'
import type { ConvocationResponderStatus, ConvocationRespondersRepository } from '../../repositories/convocation-responders-repository'
import { ListConvocationRespondersUseCase } from './ListConvocationRespondersUseCase'

// In-memory fake, same pattern as GetConvocationRosterForCoachUseCase.test.ts
// — no Supabase mock needed, domain/ is plain TypeScript.
function fakeConvocationRespondersRepository(roster: ConvocationResponderStatus[]): ConvocationRespondersRepository {
  return {
    listForConvocation: async () => roster,
  }
}

describe('ListConvocationRespondersUseCase', () => {
  it('returns the repository roster unchanged — a thin pass-through, no filtering/derivation (AC-MD-09)', async () => {
    const roster: ConvocationResponderStatus[] = [
      { userId: 'player-1', hasResponded: true, displayName: 'Joueur 1', position: 'goalkeeper' },
      { userId: 'player-2', hasResponded: false, displayName: 'Joueur 2', position: null },
    ]
    const useCase = new ListConvocationRespondersUseCase(fakeConvocationRespondersRepository(roster))

    await expect(useCase.execute('c1')).resolves.toEqual(roster)
  })

  it('returns an empty array when nobody is convoked', async () => {
    const useCase = new ListConvocationRespondersUseCase(fakeConvocationRespondersRepository([]))

    await expect(useCase.execute('c1')).resolves.toEqual([])
  })

  it('never asserts status/reason — the fake type itself has no such fields (AC-MD-08 stays a database/RLS guarantee, not a use case one)', async () => {
    const roster: ConvocationResponderStatus[] = [{ userId: 'player-1', hasResponded: true, displayName: 'Joueur 1', position: null }]
    const useCase = new ListConvocationRespondersUseCase(fakeConvocationRespondersRepository(roster))

    const result = await useCase.execute('c1')

    expect(result[0]).not.toHaveProperty('status')
    expect(result[0]).not.toHaveProperty('reason')
  })
})
