import { describe, expect, it, vi } from 'vitest'
import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import { GetTreasuryCheckpointDetailUseCase } from './GetTreasuryCheckpointDetailUseCase'
import { existingCheckpoint, financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

describe('GetTreasuryCheckpointDetailUseCase', () => {
  it('returns the checkpoint with its debrief for a treasurer', async () => {
    const useCase = new GetTreasuryCheckpointDetailUseCase(userRepository(treasurer()), financeRepository())
    await expect(useCase.execute({ actorId: 'actor-1', checkpointId: 'cp-1' })).resolves.toEqual(existingCheckpoint)
  })

  it('throws NotFoundError when the checkpoint is gone', async () => {
    const finance = financeRepository({ getTreasuryCheckpointDetail: vi.fn(async () => null) })
    const useCase = new GetTreasuryCheckpointDetailUseCase(userRepository(treasurer()), finance)
    await expect(useCase.execute({ actorId: 'actor-1', checkpointId: 'cp-1' })).rejects.toBeInstanceOf(NotFoundError)
  })

  it.each([{ role: 'authorized-officer' }, { role: 'admin' }] as const)('refuses %j without reading', async (role) => {
    const finance = financeRepository()
    const useCase = new GetTreasuryCheckpointDetailUseCase(userRepository(userWith([role])), finance)
    await expect(useCase.execute({ actorId: 'actor-1', checkpointId: 'cp-1' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.getTreasuryCheckpointDetail).not.toHaveBeenCalled()
  })
})
