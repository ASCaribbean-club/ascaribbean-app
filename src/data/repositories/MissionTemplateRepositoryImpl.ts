import type { SupabaseClient } from '@supabase/supabase-js'
import type { MissionTemplate } from '@domain/entities/mission-template'
import type {
  CreateMissionTemplateInput,
  MissionTemplateRepository,
  UpdateMissionTemplateInput,
} from '@domain/repositories/mission-template-repository'
import type { MissionTemplateRow } from '../dto/mission-template-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import {
  toMissionTemplate,
  toMissionTemplateActiveUpdateRow,
  toMissionTemplateInsertRow,
  toMissionTemplateUpdateRow,
} from '../mappers/mission-template-mapper'

const MISSION_TEMPLATE_COLUMNS = 'id, convocation_type, label, default_capacity, description, is_active, created_at'

// specs/web-mission-templates.md §2.3 — RLS: mission_templates_select_admin /
// _insert_admin / _update_admin ('mission-template:manage'). No delete
// method: there is no delete policy.
export class MissionTemplateRepositoryImpl implements MissionTemplateRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  // Creation order (PO-MT-03); "active first" grouping is a ViewModel concern.
  async listAll(): Promise<MissionTemplate[]> {
    const { data, error } = await this.client
      .from('mission_templates')
      .select(MISSION_TEMPLATE_COLUMNS)
      .order('created_at', { ascending: true })
      .overrideTypes<MissionTemplateRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toMissionTemplate)
  }

  async create(input: CreateMissionTemplateInput): Promise<MissionTemplate> {
    const { data, error } = await this.client
      .from('mission_templates')
      .insert(toMissionTemplateInsertRow(input))
      .select(MISSION_TEMPLATE_COLUMNS)
      .single()
      .overrideTypes<MissionTemplateRow>()

    if (error) throw mapSupabaseError(error)
    return toMissionTemplate(data)
  }

  async update(id: string, input: UpdateMissionTemplateInput): Promise<MissionTemplate> {
    const { data, error } = await this.client
      .from('mission_templates')
      .update(toMissionTemplateUpdateRow(input))
      .eq('id', id)
      .select(MISSION_TEMPLATE_COLUMNS)
      .single()
      .overrideTypes<MissionTemplateRow>()

    if (error) throw mapSupabaseError(error)
    return toMissionTemplate(data)
  }

  // Idempotent by construction: writing the current value is a no-op update
  // that still returns the row.
  async setActive(id: string, isActive: boolean): Promise<MissionTemplate> {
    const { data, error } = await this.client
      .from('mission_templates')
      .update(toMissionTemplateActiveUpdateRow(isActive))
      .eq('id', id)
      .select(MISSION_TEMPLATE_COLUMNS)
      .single()
      .overrideTypes<MissionTemplateRow>()

    if (error) throw mapSupabaseError(error)
    return toMissionTemplate(data)
  }
}
