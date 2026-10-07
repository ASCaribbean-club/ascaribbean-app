import { vi } from 'vitest'
import type { Expense, ExpenseCategory, FinancesSnapshot, OpeningBalance } from '../../entities/finance'
import type { User } from '../../entities/user'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'

// Test-only fakes shared by the finance use case tests.
export function userWith(roles: User['roles'], id = 'actor-1'): User {
  return { id, fullName: 'Compte', email: 'compte@example.com', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}

export function userRepository(user: User | null): UserRepository {
  return { findById: async () => user } as unknown as UserRepository
}

export function auditRepository(overrides: Partial<AuditLogRepository> = {}) {
  return {
    list: async () => ({ entries: [], hasMore: false }),
    record: vi.fn(async (_entry: RecordAuditLogEntryInput) => {}),
    ...overrides,
  } satisfies AuditLogRepository
}

export const emptySnapshot: FinancesSnapshot = {
  season: null,
  carriers: [],
  unattributedIncomeCents: 0,
  categories: [],
  expenses: [],
  checkpoints: [],
}

export function financeRepository(overrides: Partial<FinanceRepository> = {}) {
  return {
    getSnapshot: vi.fn(async () => emptySnapshot),
    listCarriers: vi.fn(async () => []),
    listCategories: vi.fn(async (): Promise<ExpenseCategory[]> => []),
    createExpense: vi.fn(
      async (input): Promise<Expense> => ({
        id: 'expense-1',
        categoryId: input.categoryId,
        carrierId: input.carrierId,
        amountCents: input.amountCents,
        label: input.label,
        spentOn: input.spentOn,
        paymentMethod: input.paymentMethod,
        recordedAt: '2026-10-06T10:00:00.000Z',
      }),
    ),
    createExpenseCategory: vi.fn(async (label: string): Promise<ExpenseCategory> => ({ id: 'cat-new', label, colorIndex: 6 })),
    createOpeningBalance: vi.fn(
      async (input): Promise<OpeningBalance> => ({ id: 'ob-1', carrierId: input.carrierId, seasonId: input.seasonId, amountCents: input.amountCents }),
    ),
    createTreasuryCheckpoint: vi.fn(async () => ({ id: 'cp-1', totalVarianceCents: -500 })),
    ...overrides,
  } satisfies FinanceRepository
}

export const treasurer = () => userWith([{ role: 'treasurer' }])
