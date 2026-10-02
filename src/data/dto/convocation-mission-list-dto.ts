// Flat row of the get_convocation_missions RPC (security definer join of
// convocation_missions, mission_assignments and users.full_name): one row per
// (mission, assignee), and ONE row with null assignee columns for a mission
// nobody registered on. Not a table or view, hence a Dto.
export interface ConvocationMissionListDto {
  mission_id: string
  convocation_id: string
  template_id: string | null
  label: string
  capacity: number
  user_id: string | null
  display_name: string | null
  assigned_by: string | null
  assigned_at: string | null
}
