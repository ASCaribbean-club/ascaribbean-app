import { describe, expect, it, vi } from 'vitest'
import { FinanceCarrierArchiveRefusedError } from '../../errors/finance-carrier-archive-refused-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import { auditRepository, userRepository, userWith } from '../finances/finance-test-support'
import { ArchiveFinanceCarrierUseCase } from './ArchiveFinanceCarrierUseCase'
import { RestoreFinanceCarrierUseCase } from './RestoreFinanceCarrierUseCase'
import { adminUser, archivedCarrier, bankCarrier, carrierRepository } from './finance-carrier-test-support'

function setup(user = adminUser(), overrides = {}) {
  const carriers = carrierRepository({ listForAdmin: vi.fn(async () => [bankCarrier, archivedCarrier]), ...overrides })
  const audit = auditRepository()
  return {
    carriers,
    audit,
    archive: new ArchiveFinanceCarrierUseCase(userRepository(user), carriers, audit),
    restore: new RestoreFinanceCarrierUseCase(userRepository(user), carriers, audit),
  }
}

describe('ArchiveFinanceCarrierUseCase', () => {
  it('archives and audits label and kind only, never the detail', async () => {
    const { carriers, audit, archive } = setup()

    await archive.execute({ actorId: 'actor-1', carrierId: 'bank-1' })

    expect(carriers.archive).toHaveBeenCalledWith('bank-1')
    expect(audit.record).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledWith({
      action: 'finance_carrier.archived',
      targetId: 'bank-1',
      targetType: 'finance_carrier',
      metadata: { label: 'Compte courant', kind: 'bank' },
    })
    expect(JSON.stringify(vi.mocked(audit.record).mock.calls)).not.toContain('Courant"')
  })

  it('writes no audit entry when the database refuses (non-zero balance)', async () => {
    const refusal = new FinanceCarrierArchiveRefusedError('non-zero-balance', 'finance_carrier_non_zero_balance')
    const { audit, archive } = setup(adminUser(), { archive: vi.fn(async () => Promise.reject(refusal)) })

    await expect(archive.execute({ actorId: 'actor-1', carrierId: 'bank-1' })).rejects.toBe(refusal)
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('refuses an already archived carrier without writing', async () => {
    const { carriers, audit, archive } = setup()
    await expect(archive.execute({ actorId: 'actor-1', carrierId: 'old-1' })).rejects.toMatchObject({ reason: 'already-archived' })
    expect(carriers.archive).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('throws NotFoundError for an unknown carrier', async () => {
    const { archive } = setup()
    await expect(archive.execute({ actorId: 'actor-1', carrierId: 'nope' })).rejects.toBeInstanceOf(NotFoundError)
  })

  it.each([{ role: 'treasurer' }, { role: 'authorized-officer' }] as const)('refuses %j before any network call', async (role) => {
    const { carriers, audit, archive } = setup(userWith([role]))
    await expect(archive.execute({ actorId: 'actor-1', carrierId: 'bank-1' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(carriers.listForAdmin).not.toHaveBeenCalled()
    expect(carriers.archive).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })
})

describe('RestoreFinanceCarrierUseCase', () => {
  it('restores an archived carrier under the SAME action and audits finance_carrier.restored', async () => {
    const { carriers, audit, restore } = setup()

    await restore.execute({ actorId: 'actor-1', carrierId: 'old-1' })

    expect(carriers.restore).toHaveBeenCalledWith('old-1')
    expect(audit.record).toHaveBeenCalledWith({
      action: 'finance_carrier.restored',
      targetId: 'old-1',
      targetType: 'finance_carrier',
      metadata: { label: 'Ancienne caisse', kind: 'cash' },
    })
  })

  it('refuses to restore an active carrier without writing', async () => {
    const { carriers, audit, restore } = setup()
    await expect(restore.execute({ actorId: 'actor-1', carrierId: 'bank-1' })).rejects.toMatchObject({ reason: 'not-archived' })
    expect(carriers.restore).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('refuses a treasurer', async () => {
    const { carriers, restore } = setup(userWith([{ role: 'treasurer' }]))
    await expect(restore.execute({ actorId: 'actor-1', carrierId: 'old-1' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(carriers.restore).not.toHaveBeenCalled()
  })
})
