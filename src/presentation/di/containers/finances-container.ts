import type { SupabaseClient } from '@supabase/supabase-js'
import { AuditLogRepositoryImpl } from '@data/repositories/AuditLogRepositoryImpl'
import { FinanceRepositoryImpl } from '@data/repositories/FinanceRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
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
  }
}
