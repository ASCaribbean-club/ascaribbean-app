import type { ConvocationRow } from './convocation-dto'

// specs/web-create-convocation.md — inline PostgREST join (no view behind it),
// hence `Dto` and not `Row` (CLAUDE.md §4): public.convocations plus embedded
// teams (+ their user_roles, to size the roster), match_details (+ opponents),
// meeting_details, users (the creator, via `created_by`) and attendance_records.
//
// PostgREST returns a to-one embed as an object, and `null` when absent; a
// to-many embed as an array. The mapper still tolerates a one-element array
// for the to-one embeds (a defensive normalisation, cheap and harmless).
export type OneOrMany<T> = T | T[] | null

export interface AdminConvocationTeamEmbed {
  id: string
  name: string
  section_id: string
  season_id: string
  user_roles: { role: string }[] | null
}

export interface AdminConvocationMatchEmbed {
  opponent_id: string
  is_home: boolean
  meeting_point_time: string | null
  meeting_point_location: string | null
  opponents: OneOrMany<{ name: string }>
}

export interface AdminConvocationMeetingEmbed {
  title: string
  agenda: string[] | null
}

export interface AdminConvocationDto extends ConvocationRow {
  teams: OneOrMany<AdminConvocationTeamEmbed>
  match_details: OneOrMany<AdminConvocationMatchEmbed>
  meeting_details: OneOrMany<AdminConvocationMeetingEmbed>
  users: OneOrMany<{ full_name: string }>
  attendance_records: { actual_status: 'present' | 'absent' }[] | null
}

// RPC parameter objects — one per type (update_*_convocation, see
// supabase/migrations/20261001120000_web_create_convocation.sql). Their
// narrowness is the point: no team, type or status parameter exists.
export interface UpdateTrainingConvocationRpcParams {
  p_convocation_id: string
  p_date: string
  p_training_location_id: string
}

export interface UpdateMatchConvocationRpcParams {
  p_convocation_id: string
  p_date: string
  p_location: string
  p_opponent_id: string
  p_is_home: boolean
  p_meeting_point_time: string | null
  p_meeting_point_location: string | null
}

export interface UpdateMeetingConvocationRpcParams {
  p_convocation_id: string
  p_date: string
  p_location: string
  p_title: string
  p_agenda: string[]
}
