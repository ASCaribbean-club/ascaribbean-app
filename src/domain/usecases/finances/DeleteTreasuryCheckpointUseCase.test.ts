import { describe, expect, it, vi } from 'vitest'
import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import { DeleteTreasuryCheckpointUseCase } from './DeleteTreasuryCheckpointUseCase'
import { auditRepository, financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

describe('DeleteTreasuryCheckpointUseCase', () => {
  it('deletes then audits date, lines (counted + frozen theoretical) and total variance, never the debrief', async () => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new DeleteTreasuryCheckpointUseCase(userRepository(treasurer()), finance, audit)

    await useCase.execute({ actorId: 'actor-1', checkpointId: 'cp-1' })

    expect(finance.deleteTreasuryCheckpoint).toHaveBeenCalledWith('cp-1')
    expect(audit.record).toHaveBeenCalledWith({
      action: 'treasury_checkpoint.deleted',
      targetId: 'cp-1',
      targetType: 'treasury_checkpoint',
      metadata: {
        before: {
          checkedOn: '2026-10-01',
          lines: [
            { carrierId: 'cash-1', countedCents: 9000, theoreticalCents: 10000 },
            { carrierId: 'bank-1', countedCents: 50000, theoreticalCents: 50000 },
          ],
          totalVarianceCents: -1000,
        },
      },
    })
    expect(JSON.stringify(vi.mocked(audit.record).mock.calls)).not.toContain('Tout est conforme')
  })

  it('throws NotFoundError without deleting when the checkpoint is gone', async () => {
    const finance = financeRepository({ getTreasuryCheckpointDetail: vi.fn(async () => null) })
    const audit = auditRepository()
    const useCase = new DeleteTreasuryCheckpointUseCase(userRepository(treasurer()), finance, audit)

    await expect(useCase.execute({ actorId: 'actor-1', checkpointId: 'cp-1' })).rejects.toBeInstanceOf(NotFoundError)
    expect(finance.deleteTreasuryCheckpoint).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it.each([{ role: 'authorized-officer' }, { role: 'admin' }] as const)('refuses %j', async (role) => {
    const finance = financeRepository()
    const useCase = new DeleteTreasuryCheckpointUseCase(userRepository(userWith([role])), finance, auditRepository())
    await expect(useCase.execute({ actorId: 'actor-1', checkpointId: 'cp-1' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.deleteTreasuryCheckpoint).not.toHaveBeenCalled()
  })
})
