import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import { ConvocationNotEditableError } from '../../errors/convocation-not-editable-error'
import { InvalidConvocationInputError } from '../../errors/invalid-convocation-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import { UpdateTrainingScheduleUseCase } from './UpdateTrainingScheduleUseCase'

const NOW = new Date('2026-08-01T10:00:00.000Z')

function convocationWith(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: 'team-1',
    type: 'training',
    date: '2026-08-10T18:00:00.000Z',
    location: null,
    trainingLocation: null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'coach-1',
    ...overrides,
  }
}

function setup(convocation: Convocation | null) {
  const updateDate = vi.fn(async (_id: string, date: string) => ({ ...(convocation as Convocation), date }))
  const repository = {
    findById: async () => convocation,
    updateDate,
  } as unknown as ConvocationRepository
  return { useCase: new UpdateTrainingScheduleUseCase(repository), updateDate }
}

describe('UpdateTrainingScheduleUseCase', () => {
  it('writes the new date for an open, upcoming training', async () => {
    const { useCase, updateDate } = setup(convocationWith())
    const result = await useCase.execute({ convocationId: 'convocation-1', date: '2026-08-11T19:00:00.000Z', now: NOW })
    expect(updateDate).toHaveBeenCalledWith('convocation-1', '2026-08-11T19:00:00.000Z')
    expect(result.date).toBe('2026-08-11T19:00:00.000Z')
  })

  it('throws NotFoundError when the convocation does not exist', async () => {
    const { useCase } = setup(null)
    await expect(useCase.execute({ convocationId: 'x', date: '2026-08-11T19:00:00.000Z', now: NOW })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws NotFoundError for a non-training convocation', async () => {
    const { useCase, updateDate } = setup(convocationWith({ type: 'match' }))
    await expect(useCase.execute({ convocationId: 'convocation-1', date: '2026-08-11T19:00:00.000Z', now: NOW })).rejects.toBeInstanceOf(NotFoundError)
    expect(updateDate).not.toHaveBeenCalled()
  })

  it('throws ConvocationNotEditableError once the training has started', async () => {
    const { useCase, updateDate } = setup(convocationWith({ date: '2026-07-31T18:00:00.000Z' }))
    await expect(useCase.execute({ convocationId: 'convocation-1', date: '2026-08-11T19:00:00.000Z', now: NOW })).rejects.toBeInstanceOf(ConvocationNotEditableError)
    expect(updateDate).not.toHaveBeenCalled()
  })

  it('throws ConvocationNotEditableError when the convocation is not open', async () => {
    const { useCase } = setup(convocationWith({ status: 'cancelled' }))
    await expect(useCase.execute({ convocationId: 'convocation-1', date: '2026-08-11T19:00:00.000Z', now: NOW })).rejects.toBeInstanceOf(ConvocationNotEditableError)
  })

  it('throws InvalidConvocationInputError when the new date is in the past', async () => {
    const { useCase, updateDate } = setup(convocationWith())
    await expect(useCase.execute({ convocationId: 'convocation-1', date: '2026-07-31T18:00:00.000Z', now: NOW })).rejects.toBeInstanceOf(InvalidConvocationInputError)
    expect(updateDate).not.toHaveBeenCalled()
  })
})
