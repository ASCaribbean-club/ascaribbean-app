import type { SupabaseClient } from '@supabase/supabase-js'
import { AuditLogRepositoryImpl } from '@data/repositories/AuditLogRepositoryImpl'
import { FinanceRepositoryImpl } from '@data/repositories/FinanceRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import { DeleteExpenseCategoryUseCase } from '@domain/usecases/finances/DeleteExpenseCategoryUseCase'
import { DeleteExpenseUseCase } from '@domain/usecases/finances/DeleteExpenseUseCase'
import { DeleteTreasuryCheckpointUseCase } from '@domain/usecases/finances/DeleteTreasuryCheckpointUseCase'
import { GetTreasuryCheckpointDetailUseCase } from '@domain/usecases/finances/GetTreasuryCheckpointDetailUseCase'
import { RenameExpenseCategoryUseCase } from '@domain/usecases/finances/RenameExpenseCategoryUseCase'
import { SetExpenseReimbursementUseCase } from '@domain/usecases/finances/SetExpenseReimbursementUseCase'
import { UpdateExpenseUseCase } from '@domain/usecases/finances/UpdateExpenseUseCase'
import { UpdateOpeningBalanceUseCase } from '@domain/usecases/finances/UpdateOpeningBalanceUseCase'
import { UpdateTreasuryCheckpointUseCase } from '@domain/usecases/finances/UpdateTreasuryCheckpointUseCase'
import { CreateExpenseCategoryUseCase } from '@domain/usecases/finances/CreateExpenseCategoryUseCase'
import { GetFinancesUseCase } from '@domain/usecases/finances/GetFinancesUseCase'
import { ListFinanceCarriersUseCase } from '@domain/usecases/finances/ListFinanceCarriersUseCase'
import { RecordExpenseUseCase } from '@domain/usecases/finances/RecordExpenseUseCase'
import { RecordOpeningBalanceUseCase } from '@domain/usecases/finances/RecordOpeningBalanceUseCase'
import { RecordTreasuryCheckpointUseCase } from '@domain/usecases/finances/RecordTreasuryCheckpointUseCase'

// specs/mob-treasurer-finances.md — the Finances screen, plus the carriers
// read reused by the two payment forms (AC-FI-31). This container's OWN
// repository instances, same per-container pattern as the others.
export interface FinancesContainer {
  getFinancesUseCase: GetFinancesUseCase
  listFinanceCarriersUseCase: ListFinanceCarriersUseCase
  recordExpenseUseCase: RecordExpenseUseCase
  createExpenseCategoryUseCase: CreateExpenseCategoryUseCase
  recordOpeningBalanceUseCase: RecordOpeningBalanceUseCase
  recordTreasuryCheckpointUseCase: RecordTreasuryCheckpointUseCase
  // specs/mob-treasurer-finances-edit.md — corrections and deletions.
  updateExpenseUseCase: UpdateExpenseUseCase
  deleteExpenseUseCase: DeleteExpenseUseCase
  // specs/finances-member-advances.md §2.7 — "À rembourser" action.
  setExpenseReimbursementUseCase: SetExpenseReimbursementUseCase
  renameExpenseCategoryUseCase: RenameExpenseCategoryUseCase
  deleteExpenseCategoryUseCase: DeleteExpenseCategoryUseCase
  updateOpeningBalanceUseCase: UpdateOpeningBalanceUseCase
  getTreasuryCheckpointDetailUseCase: GetTreasuryCheckpointDetailUseCase
  updateTreasuryCheckpointUseCase: UpdateTreasuryCheckpointUseCase
  deleteTreasuryCheckpointUseCase: DeleteTreasuryCheckpointUseCase
}

export function createFinancesContainer(supabaseClient: SupabaseClient): FinancesContainer {
  const financeRepository = new FinanceRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const auditLogRepository = new AuditLogRepositoryImpl(supabaseClient)

  return {
    getFinancesUseCase: new GetFinancesUseCase(financeRepository),
    listFinanceCarriersUseCase: new ListFinanceCarriersUseCase(financeRepository),
    recordExpenseUseCase: new RecordExpenseUseCase(userRepository, financeRepository, auditLogRepository),
    createExpenseCategoryUseCase: new CreateExpenseCategoryUseCase(userRepository, financeRepository),
    recordOpeningBalanceUseCase: new RecordOpeningBalanceUseCase(userRepository, financeRepository, auditLogRepository),
    recordTreasuryCheckpointUseCase: new RecordTreasuryCheckpointUseCase(userRepository, financeRepository, auditLogRepository),
    updateExpenseUseCase: new UpdateExpenseUseCase(userRepository, financeRepository, auditLogRepository),
    deleteExpenseUseCase: new DeleteExpenseUseCase(userRepository, financeRepository, auditLogRepository),
    setExpenseReimbursementUseCase: new SetExpenseReimbursementUseCase(userRepository, financeRepository, auditLogRepository),
    renameExpenseCategoryUseCase: new RenameExpenseCategoryUseCase(userRepository, financeRepository, auditLogRepository),
    deleteExpenseCategoryUseCase: new DeleteExpenseCategoryUseCase(userRepository, financeRepository, auditLogRepository),
    updateOpeningBalanceUseCase: new UpdateOpeningBalanceUseCase(userRepository, financeRepository, auditLogRepository),
    getTreasuryCheckpointDetailUseCase: new GetTreasuryCheckpointDetailUseCase(userRepository, financeRepository),
    updateTreasuryCheckpointUseCase: new UpdateTreasuryCheckpointUseCase(userRepository, financeRepository, auditLogRepository),
    deleteTreasuryCheckpointUseCase: new DeleteTreasuryCheckpointUseCase(userRepository, financeRepository, auditLogRepository),
  }
}
