import type { MissionTemplate } from '@domain/entities/mission-template'
import type { MissionTemplateRepository } from '@domain/repositories/mission-template-repository'

// specs/web-mission-templates.md §2.2 — reading is RLS-only (admin select
// policy), no `can()` check, same as ListTrainingLocationsUseCase.
export class ListMissionTemplatesUseCase {
  constructor(private readonly missionTemplateRepository: MissionTemplateRepository) {}

  execute(): Promise<MissionTemplate[]> {
    return this.missionTemplateRepository.listAll()
  }
}
