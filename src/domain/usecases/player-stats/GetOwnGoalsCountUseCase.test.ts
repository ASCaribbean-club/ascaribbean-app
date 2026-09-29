import { describe, expect, it, vi } from 'vitest'
import type { MatchEvent } from '@domain/entities/match-event'
import type { MatchEventRepository } from '@domain/repositories/match-event-repository'
import { GetOwnGoalsCountUseCase } from './GetOwnGoalsCountUseCase'

function fakeMatchEventRepository(overrides: Partial<MatchEventRepository> = {}): MatchEventRepository {
  return {
    add: async (event) => ({ id: 'event-new', createdAt: new Date().toISOString(), ...event }) as MatchEvent,
    delete: async () => {},
    findByConvocation: async () => [],
    getOwnGoalsCountForCurrentSeason: async () => 0,
    getOwnCardsCountForCurrentSeason: async () => ({ yellowCount: 0, redCount: 0 }),
    findByConvocations: async () => [],
    ...overrides,
  }
}

describe('GetOwnGoalsCountUseCase', () => {
  it('delegates to MatchEventRepository.getOwnGoalsCountForCurrentSeason with no argument (AC-02 — no userId to falsify)', async () => {
    const getOwnGoalsCountForCurrentSeason = vi.fn(async () => 3)
    const useCase = new GetOwnGoalsCountUseCase(fakeMatchEventRepository({ getOwnGoalsCountForCurrentSeason }))

    const result = await useCase.execute()

    expect(getOwnGoalsCountForCurrentSeason).toHaveBeenCalledExactlyOnceWith()
    expect(result).toBe(3)
  })

  // §4.3 of the UI design — zero goals is a normal state, not an error or
  // an empty state on its own; the use case must return a real 0, not null
  // or undefined, so the ViewModel can render it plainly.
  it('returns zero as a real number, not an empty state, when the player has not scored (§4.3)', async () => {
    const useCase = new GetOwnGoalsCountUseCase(fakeMatchEventRepository())

    await expect(useCase.execute()).resolves.toBe(0)
  })
})
