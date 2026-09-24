import { describe, expect, it, vi } from 'vitest'
import type { MatchEvent } from '../../entities/match-event'
import type { MatchEventRepository } from '../../repositories/match-event-repository'
import { DeleteMatchEventUseCase } from './DeleteMatchEventUseCase'

function fakeMatchEventRepository(overrides: Partial<MatchEventRepository> = {}): MatchEventRepository {
  return {
    add: async (event) => ({ id: 'event-new', createdAt: new Date().toISOString(), ...event }) as MatchEvent,
    delete: async () => {},
    findByConvocation: async () => [],
    ...overrides,
  }
}

describe('DeleteMatchEventUseCase', () => {
  it('delegates deletion to MatchEventRepository.delete with the given id (AC-MS-12)', async () => {
    const del = vi.fn(async () => {})
    const useCase = new DeleteMatchEventUseCase(fakeMatchEventRepository({ delete: del }))

    await useCase.execute('event-1')

    expect(del).toHaveBeenCalledExactlyOnceWith('event-1')
  })
})
