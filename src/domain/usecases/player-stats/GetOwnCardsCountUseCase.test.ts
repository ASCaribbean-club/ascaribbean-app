import { describe, expect, it, vi } from 'vitest'
import type { MatchEvent } from '@domain/entities/match-event'
import type { MatchEventRepository } from '@domain/repositories/match-event-repository'
import { GetOwnCardsCountUseCase } from './GetOwnCardsCountUseCase'

function fakeMatchEventRepository(overrides: Partial<MatchEventRepository> = {}): MatchEventRepository {
  return {
    add: async (event) => ({ id: 'event-new', createdAt: new Date().toISOString(), ...event }) as MatchEvent,
    delete: async () => {},
    findByConvocation: async () => [],
    getOwnGoalsCountForCurrentSeason: async () => 0,
    getOwnCardsCountForCurrentSeason: async () => ({ yellowCount: 0, redCount: 0 }),
    ...overrides,
  }
}

describe('GetOwnCardsCountUseCase', () => {
  it('delegates to MatchEventRepository.getOwnCardsCountForCurrentSeason with no argument (AC-02 — no userId to falsify)', async () => {
    const getOwnCardsCountForCurrentSeason = vi.fn(async () => ({ yellowCount: 2, redCount: 1 }))
    const useCase = new GetOwnCardsCountUseCase(fakeMatchEventRepository({ getOwnCardsCountForCurrentSeason }))

    const result = await useCase.execute()

    expect(getOwnCardsCountForCurrentSeason).toHaveBeenCalledExactlyOnceWith()
    expect(result).toEqual({ yellowCount: 2, redCount: 1 })
  })

  it('returns a zero-card summary as-is when the player has none this season', async () => {
    const useCase = new GetOwnCardsCountUseCase(fakeMatchEventRepository())

    await expect(useCase.execute()).resolves.toEqual({ yellowCount: 0, redCount: 0 })
  })
})
