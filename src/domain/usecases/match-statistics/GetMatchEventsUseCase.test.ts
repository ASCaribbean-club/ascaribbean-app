import { describe, expect, it, vi } from 'vitest'
import type { MatchEvent } from '../../entities/match-event'
import type { MatchEventRepository } from '../../repositories/match-event-repository'
import { GetMatchEventsUseCase } from './GetMatchEventsUseCase'

function fakeMatchEventRepository(overrides: Partial<MatchEventRepository> = {}): MatchEventRepository {
  return {
    add: async (event) => ({ id: 'event-new', createdAt: new Date().toISOString(), ...event }) as MatchEvent,
    delete: async () => {},
    findByConvocation: async () => [],
    ...overrides,
  }
}

describe('GetMatchEventsUseCase', () => {
  it('delegates to MatchEventRepository.findByConvocation with the given convocation id', async () => {
    const events: MatchEvent[] = [
      { id: 'event-1', convocationId: 'convo-1', userId: 'user-1', eventType: 'goal', isPenalty: false, createdBy: 'coach-1', createdAt: '2026-09-24T18:00:00Z' },
    ]
    const findByConvocation = vi.fn(async () => events)
    const useCase = new GetMatchEventsUseCase(fakeMatchEventRepository({ findByConvocation }))

    const result = await useCase.execute('convo-1')

    expect(findByConvocation).toHaveBeenCalledExactlyOnceWith('convo-1')
    expect(result).toBe(events)
  })
})
