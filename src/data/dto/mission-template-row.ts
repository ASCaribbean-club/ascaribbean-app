import type { ConvocationType } from '@domain/entities/convocation'

// Raw shape of public.mission_templates — see
// supabase/migrations/20261002170000_web_mission_templates.sql
// (specs/web-mission-templates.md §2.3).
export interface MissionTemplateRow {
  id: string
  convocation_type: ConvocationType
  label: string
  default_capacity: number
  description: string | null
  is_active: boolean
  created_at: string
}

// Insert payload — never id/created_at/is_active (DB defaults: new = active).
export interface MissionTemplateInsertRow {
  convocation_type: ConvocationType
  label: string
  default_capacity: number
  description: string | null
}

// Update payload — never convocation_type (column grant excludes it).
export interface MissionTemplateUpdateRow {
  label: string
  default_capacity: number
  description: string | null
}

// The (de)activation write — exactly one column.
export interface MissionTemplateActiveUpdateRow {
  is_active: boolean
}
