import type { SupabaseClient } from '@supabase/supabase-js'
import { AuditLogRepositoryImpl } from '@data/repositories/AuditLogRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { AuditLogRepository } from '@domain/repositories/audit-log-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { CreateSeasonUseCase } from '@domain/usecases/seasons/CreateSeasonUseCase'
import { UpdateSeasonUseCase } from '@domain/usecases/seasons/UpdateSeasonUseCase'

// specs/web-seasons.md §2.6 — a dedicated container for the /admin/seasons
// write path (findAll() is called directly from useBackofficeSeasonsViewModel,
// same "no wrapping use case for a plain passthrough read" precedent as
// news-container.ts's listAll()). Its OWN SeasonRepositoryImpl/UserRepositoryImpl
// instances, not shared with the ones other containers (profile-container.ts,
// coach-dashboard-container.ts, ...) already instantiate for their own
// SeasonRepository.findCurrent() needs — same per-container instance pattern
// used throughout di/containers/.
export interface SeasonsContainer {
  seasonRepository: SeasonRepository
  userRepository: UserRepository
  // specs/web-audit-logs.md — 2026-09-30 (fifth addendum) — this
  // container's OWN instance, not shared with any other container's own
  // (same per-container-instance pattern as every other repository above).
  auditLogRepository: AuditLogRepository
  createSeasonUseCase: CreateSeasonUseCase
  updateSeasonUseCase: UpdateSeasonUseCase
}

export function createSeasonsContainer(supabaseClient: SupabaseClient): SeasonsContainer {
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const auditLogRepository = new AuditLogRepositoryImpl(supabaseClient)
  const createSeasonUseCase = new CreateSeasonUseCase(userRepository, seasonRepository, auditLogRepository)
  const updateSeasonUseCase = new UpdateSeasonUseCase(userRepository, seasonRepository, auditLogRepository)

  return {
    seasonRepository,
    userRepository,
    auditLogRepository,
    createSeasonUseCase,
    updateSeasonUseCase,
  }
}
