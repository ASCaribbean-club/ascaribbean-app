import { describe, expect, it, vi } from 'vitest'
import { DuplicateFinanceCarrierError } from '../../errors/duplicate-finance-carrier-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceCarrierInputError } from '../../errors/invalid-finance-carrier-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { auditRepository, userRepository, userWith } from '../finances/finance-test-support'
import { UpdateFinanceCarrierUseCase } from './UpdateFinanceCarrierUseCase'
import { adminUser, carrierRepository } from './finance-carrier-test-support'

function setup(user = adminUser()) {
  const carriers = carrierRepository()
  const audit = auditRepository()
  return { carriers, audit, useCase: new UpdateFinanceCarrierUseCase(userRepository(user), carriers, audit) }
}

describe('UpdateFinanceCarrierUseCase', () => {
  it('updates and audits label/manager before-after plus a detailChanged flag', async () => {
    const { carriers, audit, useCase } = setup()

    await useCase.execute({ actorId: 'actor-1', carrierId: 'bank-1', label: ' Compte principal ', detail: 'Autre', managerUserId: 'user-3' })

    expect(carriers.update).toHaveBeenCalledWith('bank-1', { label: 'Compte principal', detail: 'Autre', managerUserId: 'user-3' })
    expect(audit.record).toHaveBeenCalledWith({
      action: 'finance_carrier.updated',
      targetId: 'bank-1',
      targetType: 'finance_carrier',
      metadata: {
        before: { label: 'Compte courant', managerUserId: null },
        after: { label: 'Compte principal', managerUserId: 'user-3' },
        detailChanged: true,
        kind: 'bank',
      },
    })
  })

  it('reports detailChanged false when only the label changes, never carries the detail text', async () => {
    const { audit, useCase } = setup()
    await useCase.execute({ actorId: 'actor-1', carrierId: 'bank-1', label: 'Nouveau nom', detail: 'Courant' })
    const metadata = vi.mocked(audit.record).mock.calls[0][0].metadata as Record<string, unknown>
    expect(metadata.detailChanged).toBe(false)
    expect(JSON.stringify(metadata)).not.toContain('Courant')
  })

  it('removes a manager (back to none)', async () => {
    const { carriers, useCase } = setup()
    await useCase.execute({ actorId: 'actor-1', carrierId: 'cash-1', label: 'Caisse buvette', detail: null, managerUserId: null })
    expect(carriers.update).toHaveBeenCalledWith('cash-1', { label: 'Caisse buvette', detail: null, managerUserId: null })
  })

  it('accepts renaming a carrier to itself with another casing', async () => {
    const { carriers, useCase } = setup()
    await useCase.execute({ actorId: 'actor-1', carrierId: 'bank-1', label: 'COMPTE COURANT', detail: 'Courant' })
    expect(carriers.update).toHaveBeenCalled()
  })

  it('writes nothing and emits no audit entry when nothing changed', async () => {
    const { carriers, audit, useCase } = setup()
    const result = await useCase.execute({ actorId: 'actor-1', carrierId: 'bank-1', label: ' Compte courant ', detail: ' Courant ', managerUserId: null })
    expect(result.id).toBe('bank-1')
    expect(carriers.update).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('refuses a duplicate of ANOTHER carrier', async () => {
    const { carriers, useCase } = setup()
    await expect(useCase.execute({ actorId: 'actor-1', carrierId: 'bank-1', label: 'caisse buvette' })).rejects.toBeInstanceOf(
      DuplicateFinanceCarrierError,
    )
    expect(carriers.update).not.toHaveBeenCalled()
  })

  it.each([{ label: '  ' }, { label: 'x'.repeat(61) }, { label: 'Ok', detail: 'x'.repeat(121) }])(
    'refuses invalid input %j before any network call',
    async (input) => {
      const { carriers, useCase } = setup()
      await expect(useCase.execute({ actorId: 'actor-1', carrierId: 'bank-1', ...input })).rejects.toBeInstanceOf(
        InvalidFinanceCarrierInputError,
      )
      expect(carriers.listForAdmin).not.toHaveBeenCalled()
      expect(carriers.update).not.toHaveBeenCalled()
    },
  )

  it('throws NotFoundError for an unknown carrier', async () => {
    const { useCase } = setup()
    await expect(useCase.execute({ actorId: 'actor-1', carrierId: 'nope', label: 'Autre' })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('refuses a treasurer without any network call', async () => {
    const { carriers, useCase } = setup(userWith([{ role: 'treasurer' }]))
    await expect(useCase.execute({ actorId: 'actor-1', carrierId: 'bank-1', label: 'Autre' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(carriers.listForAdmin).not.toHaveBeenCalled()
    expect(carriers.update).not.toHaveBeenCalled()
  })
})
