import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '@domain/entities/convocation'
import { ConvocationCreationWindowClosedError } from '@domain/errors/convocation-creation-window-closed-error'
import { InvalidConvocationInputError } from '@domain/errors/invalid-convocation-input-error'
import { TrainingDuplicationIncompleteError } from '@domain/errors/training-duplication-incomplete-error'
import type { CreateConvocationUseCase, CreateConvocationUseCaseInput, CreateTrainingConvocationInput } from './CreateConvocationUseCase'
import { CreateRecurringTrainingsUseCase, type CreateRecurringTrainingsInput } from './CreateRecurringTrainingsUseCase'

function local(year: number, month: number, day: number, hours = 18, minutes = 30): Date {
  return new Date(year, month - 1, day, hours, minutes)
}

const START = local(2026, 11, 4)

function convocationFrom(input: CreateConvocationUseCaseInput): Convocation {
  return {
    id: `training-${input.date}`,
    teamId: input.teamId,
    type: 'training',
    date: input.date,
    location: null,
    trainingLocation: null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: input.createdBy,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function setup(execute: (input: CreateConvocationUseCaseInput) => Promise<Convocation> = async (input) => convocationFrom(input)) {
  const executeMock = vi.fn(execute)
  const useCase = new CreateRecurringTrainingsUseCase({ execute: executeMock } as unknown as CreateConvocationUseCase)
  return { useCase, execute: executeMock }
}

const TRAINING: CreateTrainingConvocationInput = {
  type: 'training',
  teamId: 'team-1',
  createdBy: 'user-1',
  date: START.toISOString(),
  trainingLocationId: 'location-1',
  attendeeIds: ['player-1', 'player-2'],
}

function input(overrides: Partial<CreateRecurringTrainingsInput> = {}): CreateRecurringTrainingsInput {
  return { training: TRAINING, frequency: 'weekly', until: local(2026, 11, 25, 0, 0), ...overrides }
}

describe('CreateRecurringTrainingsUseCase', () => {
  it('creates the training itself, then one copy per occurrence, with the same team, venue and players', async () => {
    const { useCase, execute } = setup()

    const created = await useCase.execute(input())

    expect(created).toHaveLength(4)
    expect(execute.mock.calls.map(([call]) => call.date)).toEqual([
      START.toISOString(),
      local(2026, 11, 11).toISOString(),
      local(2026, 11, 18).toISOString(),
      local(2026, 11, 25).toISOString(),
    ])
    for (const [call] of execute.mock.calls) {
      expect(call).toMatchObject({ type: 'training', teamId: 'team-1', trainingLocationId: 'location-1', attendeeIds: ['player-1', 'player-2'] })
    }
  })

  it('accepts an end date exactly 3 months after the training', async () => {
    const { useCase } = setup()

    await expect(useCase.execute(input({ until: local(2027, 2, 4, 0, 0) }))).resolves.toHaveLength(14)
  })

  it('refuses an end date more than 3 months after, creating nothing', async () => {
    const { useCase, execute } = setup()

    await expect(useCase.execute(input({ until: local(2027, 2, 5, 0, 0) }))).rejects.toBeInstanceOf(InvalidConvocationInputError)
    expect(execute).not.toHaveBeenCalled()
  })

  it('refuses an end date that leaves no repetition, creating nothing', async () => {
    const { useCase, execute } = setup()

    await expect(useCase.execute(input({ until: local(2026, 11, 10, 0, 0) }))).rejects.toBeInstanceOf(InvalidConvocationInputError)
    expect(execute).not.toHaveBeenCalled()
  })

  it('rethrows the original error when the first training is refused', async () => {
    const refusal = new ConvocationCreationWindowClosedError('closed')
    const { useCase, execute } = setup(async () => {
      throw refusal
    })

    await expect(useCase.execute(input())).rejects.toBe(refusal)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('stops at the first refusal and reports what was already created', async () => {
    const refusal = new Error('network down')
    let calls = 0
    const { useCase, execute } = setup(async (call) => {
      calls += 1
      if (calls === 3) throw refusal
      return convocationFrom(call)
    })

    const error = await useCase.execute(input()).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(TrainingDuplicationIncompleteError)
    expect(error).toMatchObject({
      createdCount: 2,
      requestedCount: 4,
      firstFailedDate: local(2026, 11, 18).toISOString(),
      reason: refusal,
    })
    expect(execute).toHaveBeenCalledTimes(3)
  })
})
