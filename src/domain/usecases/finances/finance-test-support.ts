import { vi } from 'vitest'
import type { Expense, ExpenseCategory, FinancesSnapshot, OpeningBalance, TreasuryCheckpointDetail } from '../../entities/finance'
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
  usedCategoryIds: [],
  expenses: [],
  checkpoints: [],
  outstandingAdvances: [],
  advanceMembers: [],
  advanceCandidates: [],
}

// Fixtures of the correction use cases (specs/mob-treasurer-finances-edit.md).
export const existingExpense: Expense = {
  id: 'expense-1',
  seasonId: 'season-1',
  categoryId: 'cat-1',
  amountCents: 3800,
  label: 'Trousse',
  spentOn: '2026-10-04',
  payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' },
  recordedAt: '2026-10-06T10:00:00.000Z',
}

// An advance by a member, still to reimburse (specs/finances-member-advances.md).
export const existingAdvance: Expense = {
  id: 'advance-1',
  seasonId: 'season-1',
  categoryId: 'cat-1',
  amountCents: 5800,
  label: 'Maillots',
  spentOn: '2026-10-02',
  payer: { kind: 'member', userId: 'member-1', reimbursement: null },
  recordedAt: '2026-10-03T10:00:00.000Z',
}

export const existingOpeningBalance: OpeningBalance = { id: 'ob-1', carrierId: 'cash-1', seasonId: 'season-1', amountCents: 10000 }

export const existingCheckpoint: TreasuryCheckpointDetail = {
  id: 'cp-1',
  checkedOn: '2026-10-01',
  debrief: 'Tout est conforme',
  lines: [
    { carrierId: 'cash-1', countedCents: 9000, theoreticalCents: 10000 },
    { carrierId: 'bank-1', countedCents: 50000, theoreticalCents: 50000 },
  ],
}

export function financeRepository(overrides: Partial<FinanceRepository> = {}) {
  return {
    getSnapshot: vi.fn(async () => emptySnapshot),
    listCarriers: vi.fn(async () => []),
    listCategories: vi.fn(async (): Promise<ExpenseCategory[]> => []),
    createExpense: vi.fn(
      async (input): Promise<Expense> => ({
        id: 'expense-1',
        seasonId: input.seasonId,
        categoryId: input.categoryId,
        amountCents: input.amountCents,
        label: input.label,
        spentOn: input.spentOn,
        payer: input.payer,
        recordedAt: '2026-10-06T10:00:00.000Z',
      }),
    ),
    createExpenseCategory: vi.fn(async (label: string): Promise<ExpenseCategory> => ({ id: 'cat-new', label, colorIndex: 6 })),
    createOpeningBalance: vi.fn(
      async (input): Promise<OpeningBalance> => ({ id: 'ob-1', carrierId: input.carrierId, seasonId: input.seasonId, amountCents: input.amountCents }),
    ),
    createTreasuryCheckpoint: vi.fn(async () => ({ id: 'cp-1', totalVarianceCents: -500 })),
    findExpense: vi.fn(async (): Promise<Expense | null> => existingExpense),
    findOpeningBalance: vi.fn(async (): Promise<OpeningBalance | null> => existingOpeningBalance),
    getTreasuryCheckpointDetail: vi.fn(async (): Promise<TreasuryCheckpointDetail | null> => existingCheckpoint),
    updateExpense: vi.fn(async (id: string, input): Promise<Expense> => ({ ...existingExpense, ...input, id })),
    deleteExpense: vi.fn(async () => {}),
    setExpenseReimbursement: vi.fn(
      async (id: string, reimbursement): Promise<Expense> => ({
        ...existingAdvance,
        id,
        payer: { kind: 'member', userId: 'member-1', reimbursement },
      }),
    ),
    renameExpenseCategory: vi.fn(async (id: string, label: string): Promise<ExpenseCategory> => ({ id, label, colorIndex: 0 })),
    deleteExpenseCategory: vi.fn(async () => {}),
    updateOpeningBalance: vi.fn(
      async (carrierId: string, seasonId: string, amountCents: number): Promise<OpeningBalance> => ({
        id: 'ob-1',
        carrierId,
        seasonId,
        amountCents,
      }),
    ),
    updateTreasuryCheckpoint: vi.fn(async (id: string) => ({ id, totalVarianceCents: 0 })),
    deleteTreasuryCheckpoint: vi.fn(async () => {}),
    ...overrides,
  } satisfies FinanceRepository
}

export const treasurer = () => userWith([{ role: 'treasurer' }])

// Payer choices a treasurer sheet offers: the active carriers and the accounts.
export const payerChoices = { activeCarrierIds: ['cash-1', 'bank-1'], memberUserIds: ['member-1', 'member-2'] }
