import type { SupabaseClient } from '@supabase/supabase-js'
import { AuditLogRepositoryImpl } from '@data/repositories/AuditLogRepositoryImpl'
import { FinanceCarrierRepositoryImpl } from '@data/repositories/FinanceCarrierRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { UserRepository } from '@domain/repositories/user-repository'
import { ArchiveFinanceCarrierUseCase } from '@domain/usecases/finance-carriers/ArchiveFinanceCarrierUseCase'
import { CreateFinanceCarrierUseCase } from '@domain/usecases/finance-carriers/CreateFinanceCarrierUseCase'
import { ListFinanceCarriersForAdminUseCase } from '@domain/usecases/finance-carriers/ListFinanceCarriersForAdminUseCase'
import { RestoreFinanceCarrierUseCase } from '@domain/usecases/finance-carriers/RestoreFinanceCarrierUseCase'
import { UpdateFinanceCarrierUseCase } from '@domain/usecases/finance-carriers/UpdateFinanceCarrierUseCase'

// specs/web-finance-carriers.md — the /admin/finance-carriers console. Own
// repository instances, same per-container pattern as the others. No delete
// use case exists (AC-FC-07); archive and restore do (specs/finances-member-advances.md). `userRepository` is exposed for the manager
// selector's account list (UserRepository.findAll(), the AssignCoachDialog
// precedent: a plain directory read, no wrapping use case).
export interface FinanceCarriersContainer {
  userRepository: UserRepository
  listFinanceCarriersForAdminUseCase: ListFinanceCarriersForAdminUseCase
  createFinanceCarrierUseCase: CreateFinanceCarrierUseCase
  updateFinanceCarrierUseCase: UpdateFinanceCarrierUseCase
  archiveFinanceCarrierUseCase: ArchiveFinanceCarrierUseCase
  restoreFinanceCarrierUseCase: RestoreFinanceCarrierUseCase
}

export function createFinanceCarriersContainer(supabaseClient: SupabaseClient): FinanceCarriersContainer {
  const financeCarrierRepository = new FinanceCarrierRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const auditLogRepository = new AuditLogRepositoryImpl(supabaseClient)

  return {
    userRepository,
    listFinanceCarriersForAdminUseCase: new ListFinanceCarriersForAdminUseCase(financeCarrierRepository),
    createFinanceCarrierUseCase: new CreateFinanceCarrierUseCase(userRepository, financeCarrierRepository, auditLogRepository),
    updateFinanceCarrierUseCase: new UpdateFinanceCarrierUseCase(userRepository, financeCarrierRepository, auditLogRepository),
    archiveFinanceCarrierUseCase: new ArchiveFinanceCarrierUseCase(userRepository, financeCarrierRepository, auditLogRepository),
    restoreFinanceCarrierUseCase: new RestoreFinanceCarrierUseCase(userRepository, financeCarrierRepository, auditLogRepository),
  }
}
