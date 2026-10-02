import type { MissionTemplate } from '@domain/entities/mission-template'

// specs/web-mission-templates.md §2.2 — deliberately NO delete method: a
// template is deactivated, never removed.
export interface MissionTemplateRepository {
  // Every template, inactive included, in creation order.
  listAll(): Promise<MissionTemplate[]>
  create(input: CreateMissionTemplateInput): Promise<MissionTemplate>
  // The convocation type is fixed at creation and not part of this contract.
  update(id: string, input: UpdateMissionTemplateInput): Promise<MissionTemplate>
  // Idempotent: setting the value a row already has succeeds.
  setActive(id: string, isActive: boolean): Promise<MissionTemplate>
}

export type CreateMissionTemplateInput = Omit<MissionTemplate, 'id' | 'isActive'>
export type UpdateMissionTemplateInput = Pick<MissionTemplate, 'label' | 'defaultCapacity' | 'description'>
