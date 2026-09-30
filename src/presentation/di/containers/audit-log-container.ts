import type { SupabaseClient } from '@supabase/supabase-js'
import { AuditLogRepositoryImpl } from '@data/repositories/AuditLogRepositoryImpl'
import type { AuditLogRepository } from '@domain/repositories/audit-log-repository'
import { ListAuditLogUseCase } from '@domain/usecases/audit-log/ListAuditLogUseCase'

// specs/web-audit-logs.md §2.7 — its own dedicated container, same
// per-feature instance pattern as every other di/containers/ file (its OWN
// AuditLogRepositoryImpl, not shared with any other container).
export interface AuditLogContainer {
  auditLogRepository: AuditLogRepository
  listAuditLogUseCase: ListAuditLogUseCase
}

export function createAuditLogContainer(supabaseClient: SupabaseClient): AuditLogContainer {
  const auditLogRepository = new AuditLogRepositoryImpl(supabaseClient)

  return {
    auditLogRepository,
    listAuditLogUseCase: new ListAuditLogUseCase(auditLogRepository),
  }
}
