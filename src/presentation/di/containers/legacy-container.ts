import type { SupabaseClient } from '@supabase/supabase-js'
import { LegacyRepositoryImpl } from '@data/repositories/LegacyRepositoryImpl'
import { AdminConvocationRepositoryImpl } from '@data/repositories/AdminConvocationRepositoryImpl'
import { AuditLogRepositoryImpl } from '@data/repositories/AuditLogRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import type { AdminConvocationRepository } from '@domain/repositories/admin-convocation-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import type { LegacyRepository } from '@domain/repositories/legacy-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import { SetLegacySeasonModeUseCase } from '@domain/usecases/legacy/SetLegacySeasonModeUseCase'
import { AwardLegacyPointsUseCase } from '@domain/usecases/legacy/AwardLegacyPointsUseCase'
import { SaveLegacyTiersUseCase } from '@domain/usecases/legacy/SaveLegacyTiersUseCase'
import { GetLegacyOverviewUseCase } from '@domain/usecases/legacy/GetLegacyOverviewUseCase'

// docs/specs/asc-legacy.md §6.1 — player Legacy screen (read side). Its own
// repository instances, per the per-container pattern of di/containers/.
export interface LegacyContainer {
  legacyRepository: LegacyRepository
  seasonRepository: SeasonRepository
  getLegacyOverviewUseCase: GetLegacyOverviewUseCase
  // Backoffice "ASC Legacy" tab (admin).
  saveLegacyTiersUseCase: SaveLegacyTiersUseCase
  // Same use case as the season dialog: the points mode is editable from both.
  setLegacySeasonModeUseCase: SetLegacySeasonModeUseCase
  // Backoffice "Points attribués" tab: the player directory and the manual award.
  userRepository: UserRepository
  awardLegacyPointsUseCase: AwardLegacyPointsUseCase
  // The convocation behind an entry, read on demand when a row is expanded.
  adminConvocationRepository: AdminConvocationRepository
}

export function createLegacyContainer(supabaseClient: SupabaseClient): LegacyContainer {
  const legacyRepository = new LegacyRepositoryImpl(supabaseClient)
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const getLegacyOverviewUseCase = new GetLegacyOverviewUseCase(legacyRepository, seasonRepository)

  const userRepository = new UserRepositoryImpl(supabaseClient)
  const saveLegacyTiersUseCase = new SaveLegacyTiersUseCase(userRepository, legacyRepository)

  const setLegacySeasonModeUseCase = new SetLegacySeasonModeUseCase(userRepository, legacyRepository)

  const auditLogRepository = new AuditLogRepositoryImpl(supabaseClient)
  const awardLegacyPointsUseCase = new AwardLegacyPointsUseCase(userRepository, legacyRepository, seasonRepository, auditLogRepository)

  return {
    legacyRepository,
    seasonRepository,
    getLegacyOverviewUseCase,
    saveLegacyTiersUseCase,
    setLegacySeasonModeUseCase,
    userRepository,
    awardLegacyPointsUseCase,
    adminConvocationRepository: new AdminConvocationRepositoryImpl(supabaseClient),
  }
}
