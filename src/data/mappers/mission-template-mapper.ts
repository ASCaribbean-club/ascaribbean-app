import type { MissionTemplate } from '@domain/entities/mission-template'
import type { CreateMissionTemplateInput, UpdateMissionTemplateInput } from '@domain/repositories/mission-template-repository'
import type {
  MissionTemplateActiveUpdateRow,
  MissionTemplateInsertRow,
  MissionTemplateRow,
  MissionTemplateUpdateRow,
} from '../dto/mission-template-row'

export function toMissionTemplate(row: MissionTemplateRow): MissionTemplate {
  return {
    id: row.id,
    convocationType: row.convocation_type,
    label: row.label,
    defaultCapacity: row.default_capacity,
    description: row.description,
    isActive: row.is_active,
  }
}

export function toMissionTemplateInsertRow(input: CreateMissionTemplateInput): MissionTemplateInsertRow {
  return {
    convocation_type: input.convocationType,
    label: input.label,
    default_capacity: input.defaultCapacity,
    description: input.description,
  }
}

export function toMissionTemplateUpdateRow(input: UpdateMissionTemplateInput): MissionTemplateUpdateRow {
  return {
    label: input.label,
    default_capacity: input.defaultCapacity,
    description: input.description,
  }
}

export function toMissionTemplateActiveUpdateRow(isActive: boolean): MissionTemplateActiveUpdateRow {
  return { is_active: isActive }
}
