// Raw shape of public.convocation_missions — see
// supabase/migrations/*_match_details_missions.sql
// (specs/match-details-missions.md §2.1).
export interface ConvocationMissionRow {
  id: string
  convocation_id: string
  template_id: string | null
  label: string
  capacity: number
}

// Insert payload of an ad hoc mission — `template_id` is always null here
// (template copies are made by the create_*_convocation RPCs, never by the
// client), `id` is a DB default.
export interface ConvocationMissionAdHocInsertRow {
  convocation_id: string
  template_id: null
  label: string
  capacity: number
}
