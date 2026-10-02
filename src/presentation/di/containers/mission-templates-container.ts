import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionTemplateRepositoryImpl } from '@data/repositories/MissionTemplateRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { MissionTemplateRepository } from '@domain/repositories/mission-template-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { CreateMissionTemplateUseCase } from '@domain/usecases/mission-templates/CreateMissionTemplateUseCase'
import { ListMissionTemplatesUseCase } from '@domain/usecases/mission-templates/ListMissionTemplatesUseCase'
import { SetMissionTemplateActiveUseCase } from '@domain/usecases/mission-templates/SetMissionTemplateActiveUseCase'
import { UpdateMissionTemplateUseCase } from '@domain/usecases/mission-templates/UpdateMissionTemplateUseCase'

// specs/web-mission-templates.md §2.4 — the /admin/mission-templates console:
// the admin list read plus the three writes.
export interface MissionTemplatesContainer {
  missionTemplateRepository: MissionTemplateRepository
  userRepository: UserRepository
  listMissionTemplatesUseCase: ListMissionTemplatesUseCase
  createMissionTemplateUseCase: CreateMissionTemplateUseCase
  updateMissionTemplateUseCase: UpdateMissionTemplateUseCase
  setMissionTemplateActiveUseCase: SetMissionTemplateActiveUseCase
}

export function createMissionTemplatesContainer(supabaseClient: SupabaseClient): MissionTemplatesContainer {
  const missionTemplateRepository = new MissionTemplateRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)

  return {
    missionTemplateRepository,
    userRepository,
    listMissionTemplatesUseCase: new ListMissionTemplatesUseCase(missionTemplateRepository),
    createMissionTemplateUseCase: new CreateMissionTemplateUseCase(userRepository, missionTemplateRepository),
    updateMissionTemplateUseCase: new UpdateMissionTemplateUseCase(userRepository, missionTemplateRepository),
    setMissionTemplateActiveUseCase: new SetMissionTemplateActiveUseCase(userRepository, missionTemplateRepository),
  }
}
