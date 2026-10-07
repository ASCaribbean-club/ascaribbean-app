import { describe, expect, it, vi } from 'vitest'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { RecordTreasuryCheckpointUseCase, type RecordTreasuryCheckpointUseCaseInput } from './RecordTreasuryCheckpointUseCase'
import { auditRepository, financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

function validInput(overrides: Partial<RecordTreasuryCheckpointUseCaseInput> = {}): RecordTreasuryCheckpointUseCaseInput {
  return {
    actorId: 'actor-1',
    checkedOn: '2026-10-06',
    today: '2026-10-06',
    counts: [
      { carrierId: 'bank-1', countedCents: 423400 },
      { carrierId: 'cash-1', countedCents: 0 },
    ],
    debrief: '  Remise prévue lundi  ',
    ...overrides,
  }
}

describe('RecordTreasuryCheckpointUseCase', () => {
  it('sends only the counts and a trimmed debrief (never theoretical amounts)', async () => {
    const finance = financeRepository()
    const useCase = new RecordTreasuryCheckpointUseCase(userRepository(treasurer()), finance, auditRepository())

    await useCase.execute(validInput())

    expect(finance.createTreasuryCheckpoint).toHaveBeenCalledWith({
      checkedOn: '2026-10-06',
      debrief: 'Remise prévue lundi',
      counts: [
        { carrierId: 'bank-1', countedCents: 423400 },
        { carrierId: 'cash-1', countedCents: 0 },
      ],
    })
  })

  it('stores an empty debrief as null', async () => {
    const finance = financeRepository()
    const useCase = new RecordTreasuryCheckpointUseCase(userRepository(treasurer()), finance, auditRepository())

    await useCase.execute(validInput({ debrief: '   ' }))

    expect(finance.createTreasuryCheckpoint).toHaveBeenCalledWith(expect.objectContaining({ debrief: null }))
  })

  it('audits the total variance only, never the debrief', async () => {
    const audit = auditRepository()
    const useCase = new RecordTreasuryCheckpointUseCase(userRepository(treasurer()), financeRepository(), audit)

    await useCase.execute(validInput())

    expect(audit.record).toHaveBeenCalledWith({
      action: 'treasury_checkpoint.recorded',
      targetId: 'cp-1',
      targetType: 'treasury_checkpoint',
      metadata: { totalVarianceCents: -500 },
    })
    expect(JSON.stringify(vi.mocked(audit.record).mock.calls)).not.toContain('Remise')
  })

  it.each([
    ['no count', { counts: [] }],
    ['a duplicated carrier', { counts: [{ carrierId: 'bank-1', countedCents: 1 }, { carrierId: 'bank-1', countedCents: 2 }] }],
    ['a negative count', { counts: [{ carrierId: 'bank-1', countedCents: -1 }] }],
    ['a fractional count', { counts: [{ carrierId: 'bank-1', countedCents: 1.5 }] }],
    ['a future date', { checkedOn: '2026-10-07' }],
    ['a missing date', { checkedOn: '' }],
    ['an over-long debrief', { debrief: 'a'.repeat(501) }],
  ])('rejects %s before any write', async (_name, overrides) => {
    const finance = financeRepository()
    const useCase = new RecordTreasuryCheckpointUseCase(userRepository(treasurer()), finance, auditRepository())

    await expect(useCase.execute(validInput(overrides))).rejects.toBeInstanceOf(InvalidFinanceInputError)
    expect(finance.createTreasuryCheckpoint).not.toHaveBeenCalled()
  })

  it.each([[{ role: 'authorized-officer' }], [{ role: 'admin' }]] as const)('refuses %j before any call', async (role) => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new RecordTreasuryCheckpointUseCase(userRepository(userWith([role])), finance, audit)

    await expect(useCase.execute(validInput())).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.createTreasuryCheckpoint).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })
})
