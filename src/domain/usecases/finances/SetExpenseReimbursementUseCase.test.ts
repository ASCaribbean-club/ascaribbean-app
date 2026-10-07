import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { SetExpenseReimbursementUseCase, type SetExpenseReimbursementUseCaseInput } from './SetExpenseReimbursementUseCase'
import { auditRepository, existingAdvance, financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

// existingAdvance: spent 2026-10-02, still to reimburse.
function input(overrides: Partial<SetExpenseReimbursementUseCaseInput> = {}): SetExpenseReimbursementUseCaseInput {
  return {
    actorId: 'actor-1',
    expenseId: 'advance-1',
    today: '2026-10-06',
    reimbursement: { reimbursedOn: '2026-10-05', paymentMethod: 'transfer' },
    ...overrides,
  }
}

function setup(user: User | null = treasurer(), overrides = {}) {
  const finance = financeRepository({ findExpense: vi.fn(async () => existingAdvance), ...overrides })
  const audit = auditRepository()
  return { finance, audit, useCase: new SetExpenseReimbursementUseCase(userRepository(user), finance, audit) }
}

describe('SetExpenseReimbursementUseCase', () => {
  it('marks an advance reimbursed and emits expense.reimbursement_updated without any name or label', async () => {
    const { finance, audit, useCase } = setup()

    await useCase.execute(input())

    expect(finance.setExpenseReimbursement).toHaveBeenCalledWith('advance-1', { reimbursedOn: '2026-10-05', paymentMethod: 'transfer' })
    expect(audit.record).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledWith({
      action: 'expense.reimbursement_updated',
      targetId: 'advance-1',
      targetType: 'expense',
      metadata: {
        before: { reimbursedOn: null, paymentMethod: null },
        after: { reimbursedOn: '2026-10-05', paymentMethod: 'transfer' },
        advancedByUserId: 'member-1',
        amountCents: 5800,
        seasonId: 'season-1',
      },
    })
    expect(JSON.stringify(vi.mocked(audit.record).mock.calls)).not.toContain('Maillots')
  })

  it('cancels a reimbursement (null) and audits the before/after', async () => {
    const reimbursed = { ...existingAdvance, payer: { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-04', paymentMethod: 'cash' } } } as const
    const { finance, audit, useCase } = setup(treasurer(), { findExpense: vi.fn(async () => reimbursed) })

    await useCase.execute(input({ reimbursement: null }))

    expect(finance.setExpenseReimbursement).toHaveBeenCalledWith('advance-1', null)
    expect(vi.mocked(audit.record).mock.calls[0][0].metadata).toMatchObject({
      before: { reimbursedOn: '2026-10-04', paymentMethod: 'cash' },
      after: { reimbursedOn: null, paymentMethod: null },
    })
  })

  it('writes nothing and emits no audit entry when nothing changes', async () => {
    const { finance, audit, useCase } = setup()
    await expect(useCase.execute(input({ reimbursement: null }))).resolves.toMatchObject({ id: 'advance-1' })
    expect(finance.setExpenseReimbursement).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('accepts a date exactly equal to today and to the advance date', async () => {
    const { useCase } = setup()
    await expect(useCase.execute(input({ reimbursement: { reimbursedOn: '2026-10-06', paymentMethod: 'cash' } }))).resolves.toBeDefined()
    await expect(useCase.execute(input({ reimbursement: { reimbursedOn: '2026-10-02', paymentMethod: 'cash' } }))).resolves.toBeDefined()
  })

  it.each([
    ['a future date', { reimbursedOn: '2026-10-07', paymentMethod: 'cash' }],
    ['a date before the advance', { reimbursedOn: '2026-10-01', paymentMethod: 'cash' }],
    ['no date', { reimbursedOn: '', paymentMethod: 'cash' }],
    ['an unknown method', { reimbursedOn: '2026-10-05', paymentMethod: 'bitcoin' }],
  ])('rejects %s and writes nothing', async (_name, reimbursement) => {
    const { finance, audit, useCase } = setup()
    await expect(useCase.execute(input({ reimbursement: reimbursement as never }))).rejects.toBeInstanceOf(InvalidFinanceInputError)
    expect(finance.setExpenseReimbursement).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('validates what needs no data before any network call', async () => {
    const { finance, useCase } = setup()
    await expect(useCase.execute(input({ reimbursement: { reimbursedOn: '2026-10-07', paymentMethod: 'cash' } }))).rejects.toBeInstanceOf(
      InvalidFinanceInputError,
    )
    expect(finance.findExpense).not.toHaveBeenCalled()
  })

  it('refuses an expense paid from a carrier', async () => {
    const { finance, useCase } = setup(treasurer(), {
      findExpense: vi.fn(async () => ({ ...existingAdvance, payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' } })),
    })
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(InvalidFinanceInputError)
    expect(finance.setExpenseReimbursement).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when the expense is gone', async () => {
    const { finance, useCase } = setup(treasurer(), { findExpense: vi.fn(async () => null) })
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(NotFoundError)
    expect(finance.setExpenseReimbursement).not.toHaveBeenCalled()
  })

  it('emits no audit entry when the write itself fails', async () => {
    const { audit, useCase } = setup(treasurer(), { setExpenseReimbursement: vi.fn(async () => Promise.reject(new NotFoundError('gone'))) })
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(NotFoundError)
    expect(audit.record).not.toHaveBeenCalled()
  })

  it.each([{ role: 'authorized-officer' }, { role: 'admin' }, { role: 'coach', teamIds: ['team-1'] }] as User['roles'])(
    'refuses %j before any network call',
    async (role) => {
      const { finance, audit, useCase } = setup(userWith([role]))
      await expect(useCase.execute(input())).rejects.toBeInstanceOf(ForbiddenError)
      expect(finance.findExpense).not.toHaveBeenCalled()
      expect(finance.setExpenseReimbursement).not.toHaveBeenCalled()
      expect(audit.record).not.toHaveBeenCalled()
    },
  )

  it('refuses an unknown actor', async () => {
    const { useCase } = setup(null)
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(ForbiddenError)
  })
})
