import { describe, expect, it, vi } from 'vitest'
import { DuplicateFinanceCarrierError } from '../../errors/duplicate-finance-carrier-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceCarrierInputError } from '../../errors/invalid-finance-carrier-input-error'
import { auditRepository, userRepository, userWith } from '../finances/finance-test-support'
import { CreateFinanceCarrierUseCase } from './CreateFinanceCarrierUseCase'
import { adminUser, carrierRepository } from './finance-carrier-test-support'

function setup(overrides = {}, user = adminUser()) {
  const carriers = carrierRepository(overrides)
  const audit = auditRepository()
  return { carriers, audit, useCase: new CreateFinanceCarrierUseCase(userRepository(user), carriers, audit) }
}

describe('CreateFinanceCarrierUseCase', () => {
  it('creates a normalized carrier and audits structured fields only', async () => {
    const { carriers, audit, useCase } = setup()

    await useCase.execute({ actorId: 'actor-1', label: '  Livret   club ', kind: 'bank', detail: ' Épargne ', managerUserId: 'user-3' })

    expect(carriers.create).toHaveBeenCalledWith({ label: 'Livret club', kind: 'bank', detail: 'Épargne', managerUserId: 'user-3' })
    expect(audit.record).toHaveBeenCalledWith({
      action: 'finance_carrier.created',
      targetId: 'carrier-new',
      targetType: 'finance_carrier',
      metadata: { label: 'Livret club', kind: 'bank', managerUserId: 'user-3', hasDetail: true },
    })
  })

  it('stores an empty detail as null and audits hasDetail false, never the detail text', async () => {
    const { carriers, audit, useCase } = setup()
    await useCase.execute({ actorId: 'actor-1', label: 'Caisse tournoi', kind: 'cash', detail: '   ' })
    expect(carriers.create).toHaveBeenCalledWith({ label: 'Caisse tournoi', kind: 'cash', detail: null, managerUserId: null })
    const metadata = vi.mocked(audit.record).mock.calls[0][0].metadata
    expect(metadata).toMatchObject({ hasDetail: false, managerUserId: null })
    expect(JSON.stringify(metadata)).not.toContain('detail":"')
  })

  it.each([
    { label: '   ', kind: 'bank' },
    { label: 'x'.repeat(61), kind: 'bank' },
    { label: 'Ok', kind: 'card' },
    { label: 'Ok', kind: 'bank', detail: 'x'.repeat(121) },
  ])('refuses invalid input %j before any network call', async (input) => {
    const { carriers, audit, useCase } = setup()
    await expect(useCase.execute({ actorId: 'actor-1', ...input })).rejects.toBeInstanceOf(InvalidFinanceCarrierInputError)
    expect(carriers.listForAdmin).not.toHaveBeenCalled()
    expect(carriers.create).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('refuses a duplicate label (case/accent insensitive, any kind)', async () => {
    const { carriers, audit, useCase } = setup()
    await expect(useCase.execute({ actorId: 'actor-1', label: 'CAISSE buvette', kind: 'bank' })).rejects.toBeInstanceOf(
      DuplicateFinanceCarrierError,
    )
    expect(carriers.create).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it.each([[[{ role: 'treasurer' }]], [[{ role: 'authorized-officer' }]], [[{ role: 'coach', teamIds: ['t'] }]]] as const)(
    'refuses a non-admin %j without any network call',
    async (roles) => {
      const { carriers, useCase } = setup({}, userWith([...roles] as never))
      await expect(useCase.execute({ actorId: 'actor-1', label: 'Livret', kind: 'bank' })).rejects.toBeInstanceOf(ForbiddenError)
      expect(carriers.listForAdmin).not.toHaveBeenCalled()
      expect(carriers.create).not.toHaveBeenCalled()
    },
  )

  it('still returns the created carrier when the audit write fails', async () => {
    const carriers = carrierRepository()
    const audit = auditRepository({ record: vi.fn(async () => Promise.reject(new Error('boom'))) })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const useCase = new CreateFinanceCarrierUseCase(userRepository(adminUser()), carriers, audit)
    await expect(useCase.execute({ actorId: 'actor-1', label: 'Livret', kind: 'bank' })).resolves.toMatchObject({ id: 'carrier-new' })
    spy.mockRestore()
  })
})
