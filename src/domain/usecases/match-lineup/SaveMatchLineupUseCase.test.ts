import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { LineupSlots } from '../../entities/match-lineup'
import { InvalidMatchLineupInputError } from '../../errors/invalid-match-lineup-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { ConvocationRespondersRepository } from '../../repositories/convocation-responders-repository'
import type { MatchLineupRepository } from '../../repositories/match-lineup-repository'
import { SaveMatchLineupUseCase } from './SaveMatchLineupUseCase'

function build(options: { convocation?: Partial<Convocation> | null; convokedIds?: string[] } = {}) {
  const save = vi.fn(async () => {})
  const convocation =
    options.convocation === null ? null : ({ id: 'c1', type: 'match', teamId: 't1', ...options.convocation } as Convocation)
  const convocationRepository = { findById: async () => convocation } as unknown as ConvocationRepository
  const respondersRepository: ConvocationRespondersRepository = {
    listForConvocation: async () =>
      (options.convokedIds ?? ['a', 'b', 'c']).map((userId) => ({
        userId,
        hasResponded: false,
        displayName: userId,
        position: null,
      })),
  }
  const lineupRepository: MatchLineupRepository = { findByConvocationId: async () => null, save }
  return { useCase: new SaveMatchLineupUseCase(convocationRepository, respondersRepository, lineupRepository), save }
}

const slots = (ids: (string | null)[]): LineupSlots => [...ids, ...Array(11 - ids.length).fill(null)]

describe('SaveMatchLineupUseCase', () => {
  it('saves a valid incomplete lineup and resolves true (AC-MC-08)', async () => {
    const { useCase, save } = build()
    const result = await useCase.execute({ convocationId: 'c1', formation: '4-3-3', slots: slots(['a', 'b']) })
    expect(result).toBe(true)
    expect(save).toHaveBeenCalledExactlyOnceWith('c1', '4-3-3', slots(['a', 'b']))
  })

  it('does not persist an entirely empty lineup (Q-UI-8)', async () => {
    const { useCase, save } = build()
    const result = await useCase.execute({ convocationId: 'c1', formation: '4-3-3', slots: slots([]) })
    expect(result).toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it('rejects a player who is not convoked (AC-MC-06/07)', async () => {
    const { useCase, save } = build()
    await expect(useCase.execute({ convocationId: 'c1', formation: '4-3-3', slots: slots(['z']) })).rejects.toBeInstanceOf(
      InvalidMatchLineupInputError,
    )
    expect(save).not.toHaveBeenCalled()
  })

  it('rejects the same player on two slots', async () => {
    const { useCase } = build()
    await expect(useCase.execute({ convocationId: 'c1', formation: '4-3-3', slots: slots(['a', 'a']) })).rejects.toBeInstanceOf(
      InvalidMatchLineupInputError,
    )
  })

  it('rejects an unknown formation', async () => {
    const { useCase } = build()
    await expect(useCase.execute({ convocationId: 'c1', formation: '1-1-1', slots: slots(['a']) })).rejects.toBeInstanceOf(
      InvalidMatchLineupInputError,
    )
  })

  it('rejects a non-match convocation', async () => {
    const { useCase } = build({ convocation: { type: 'training' } })
    await expect(useCase.execute({ convocationId: 'c1', formation: '4-3-3', slots: slots(['a']) })).rejects.toBeInstanceOf(
      InvalidMatchLineupInputError,
    )
  })

  it('rejects an unknown convocation', async () => {
    const { useCase } = build({ convocation: null })
    await expect(useCase.execute({ convocationId: 'c1', formation: '4-3-3', slots: slots(['a']) })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('has no time window: a closed past match is still saved (AC-MC-22)', async () => {
    const { useCase, save } = build({ convocation: { status: 'closed', date: '2020-01-01T10:00:00.000Z' } })
    await expect(useCase.execute({ convocationId: 'c1', formation: '4-4-2', slots: slots(['a']) })).resolves.toBe(true)
    expect(save).toHaveBeenCalledOnce()
  })
})
