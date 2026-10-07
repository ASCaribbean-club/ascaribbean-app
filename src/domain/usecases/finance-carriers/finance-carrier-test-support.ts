import { vi } from 'vitest'
import type { AdminFinanceCarrier } from '../../entities/finance'
import type { FinanceCarrierRepository } from '../../repositories/finance-carrier-repository'
import { userWith } from '../finances/finance-test-support'

// Test-only fakes shared by the finance carrier use case tests.
export const bankCarrier: AdminFinanceCarrier = {
  id: 'bank-1',
  label: 'Compte courant',
  kind: 'bank',
  detail: 'Courant',
  managerName: null,
  managerUserId: null,
  archivedAt: null,
}

export const cashCarrier: AdminFinanceCarrier = {
  id: 'cash-1',
  label: 'Caisse buvette',
  kind: 'cash',
  detail: null,
  managerName: 'Compte',
  managerUserId: 'user-9',
  archivedAt: null,
}

export function carrierRepository(overrides: Partial<FinanceCarrierRepository> = {}) {
  return {
    listForAdmin: vi.fn(async (): Promise<AdminFinanceCarrier[]> => [bankCarrier, cashCarrier]),
    create: vi.fn(
      async (input): Promise<AdminFinanceCarrier> => ({
        id: 'carrier-new',
        label: input.label,
        kind: input.kind,
        detail: input.detail,
        managerName: null,
        managerUserId: input.managerUserId,
        archivedAt: null,
      }),
    ),
    update: vi.fn(
      async (id: string, input): Promise<AdminFinanceCarrier> => ({
        id,
        label: input.label,
        kind: id === 'bank-1' ? 'bank' : 'cash',
        detail: input.detail,
        managerName: null,
        managerUserId: input.managerUserId,
        archivedAt: null,
      }),
    ),
    archive: vi.fn(async () => {}),
    restore: vi.fn(async () => {}),
    ...overrides,
  } satisfies FinanceCarrierRepository
}

export const adminUser = () => userWith([{ role: 'admin' }])

export const archivedCarrier: AdminFinanceCarrier = {
  id: 'old-1',
  label: 'Ancienne caisse',
  kind: 'cash',
  detail: null,
  managerName: null,
  managerUserId: null,
  archivedAt: '2026-09-01T10:00:00.000Z',
}
