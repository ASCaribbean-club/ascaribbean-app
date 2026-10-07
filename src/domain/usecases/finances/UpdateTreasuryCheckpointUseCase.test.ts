import { describe, expect, it, vi } from 'vitest'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { UpdateTreasuryCheckpointUseCase, type UpdateTreasuryCheckpointUseCaseInput } from './UpdateTreasuryCheckpointUseCase'
import { auditRepository, financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

// existingCheckpoint: cash-1 counted 9000 (theoretical 10000), bank-1 counted
// 50000 (theoretical 50000), debrief "Tout est conforme".
function input(overrides: Partial<UpdateTreasuryCheckpointUseCaseInput> = {}): UpdateTreasuryCheckpointUseCaseInput {
  return {
    actorId: 'actor-1',
    checkpointId: 'cp-1',
    counts: [
      { carrierId: 'cash-1', countedCents: 9500 },
      { carrierId: 'bank-1', countedCents: 50000 },
    ],
    debrief: 'Tout est conforme',
    ...overrides,
  }
}

describe('UpdateTreasuryCheckpointUseCase', () => {
  it('sends only counted amounts and the debrief (no theoretical, no date)', async () => {
    const finance = financeRepository({ updateTreasuryCheckpoint: vi.fn(async (id: string) => ({ id, totalVarianceCents: -500 })) })
    const useCase = new UpdateTreasuryCheckpointUseCase(userRepository(treasurer()), finance, auditRepository())

    await useCase.execute(input({ debrief: '  Nouveau texte ' }))

    expect(finance.updateTreasuryCheckpoint).toHaveBeenCalledWith('cp-1', {
      debrief: 'Nouveau texte',
      counts: [
        { carrierId: 'cash-1', countedCents: 9500 },
        { carrierId: 'bank-1', countedCents: 50000 },
      ],
    })
  })

  it('sends a null debrief when it is cleared', async () => {
    const finance = financeRepository()
    const useCase = new UpdateTreasuryCheckpointUseCase(userRepository(treasurer()), finance, auditRepository())
    await useCase.execute(input({ debrief: '   ' }))
    expect(vi.mocked(finance.updateTreasuryCheckpoint).mock.calls[0][1].debrief).toBeNull()
  })

  it('audits counted amounts and variance before/after, debriefChanged, and never the debrief text', async () => {
    const finance = financeRepository({ updateTreasuryCheckpoint: vi.fn(async (id: string) => ({ id, totalVarianceCents: -500 })) })
    const audit = auditRepository()
    const useCase = new UpdateTreasuryCheckpointUseCase(userRepository(treasurer()), finance, audit)

    await useCase.execute(input({ debrief: 'Texte libre sensible' }))

    expect(audit.record).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledWith({
      action: 'treasury_checkpoint.updated',
      targetId: 'cp-1',
      targetType: 'treasury_checkpoint',
      metadata: {
        before: {
          counts: [
            { carrierId: 'cash-1', countedCents: 9000 },
            { carrierId: 'bank-1', countedCents: 50000 },
          ],
          totalVarianceCents: -1000,
        },
        after: {
          counts: [
            { carrierId: 'cash-1', countedCents: 9500 },
            { carrierId: 'bank-1', countedCents: 50000 },
          ],
          totalVarianceCents: -500,
        },
        debriefChanged: true,
      },
    })
    const serialized = JSON.stringify(vi.mocked(audit.record).mock.calls)
    expect(serialized).not.toContain('Texte libre sensible')
    expect(serialized).not.toContain('Tout est conforme')
  })

  it('flags debriefChanged false when only an amount changed', async () => {
    const audit = auditRepository()
    const useCase = new UpdateTreasuryCheckpointUseCase(userRepository(treasurer()), financeRepository(), audit)
    await useCase.execute(input())
    expect(vi.mocked(audit.record).mock.calls[0][0].metadata).toMatchObject({ debriefChanged: false })
  })

  it('writes nothing and emits no audit entry when nothing changed', async () => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new UpdateTreasuryCheckpointUseCase(userRepository(treasurer()), finance, audit)

    await expect(useCase.execute(input({ counts: [{ carrierId: 'cash-1', countedCents: 9000 }, { carrierId: 'bank-1', countedCents: 50000 }] }))).resolves.toEqual({
      id: 'cp-1',
      totalVarianceCents: -1000,
    })

    expect(finance.updateTreasuryCheckpoint).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when the checkpoint is gone', async () => {
    const finance = financeRepository({ getTreasuryCheckpointDetail: vi.fn(async () => null) })
    const useCase = new UpdateTreasuryCheckpointUseCase(userRepository(treasurer()), finance, auditRepository())
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(NotFoundError)
  })

  it.each([
    ['no count', { counts: [] }],
    ['negative count', { counts: [{ carrierId: 'cash-1', countedCents: -1 }, { carrierId: 'bank-1', countedCents: 1 }] }],
    ['fractional count', { counts: [{ carrierId: 'cash-1', countedCents: 1.5 }, { carrierId: 'bank-1', countedCents: 1 }] }],
    ['duplicate carrier', { counts: [{ carrierId: 'cash-1', countedCents: 1 }, { carrierId: 'cash-1', countedCents: 2 }] }],
    ['missing a counted carrier', { counts: [{ carrierId: 'cash-1', countedCents: 1 }] }],
    ['a carrier not counted by this point', { counts: [{ carrierId: 'cash-1', countedCents: 1 }, { carrierId: 'other', countedCents: 1 }] }],
    ['too long debrief', { debrief: 'x'.repeat(501) }],
    ['missing id', { checkpointId: '' }],
  ])('rejects %s before any write', async (_name, overrides) => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new UpdateTreasuryCheckpointUseCase(userRepository(treasurer()), finance, audit)

    await expect(useCase.execute(input(overrides))).rejects.toBeInstanceOf(InvalidFinanceInputError)
    expect(finance.updateTreasuryCheckpoint).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it.each([{ role: 'authorized-officer' }, { role: 'admin' }] as const)('refuses %j', async (role) => {
    const finance = financeRepository()
    const useCase = new UpdateTreasuryCheckpointUseCase(userRepository(userWith([role])), finance, auditRepository())
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.updateTreasuryCheckpoint).not.toHaveBeenCalled()
  })
})
