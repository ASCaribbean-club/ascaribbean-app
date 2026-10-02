// Raw shape of public.mission_assignments, and of the row the claim_mission
// RPC returns (specs/match-details-missions.md §2.1/§2.5). No insert payload
// type: there is no direct insert path, every registration goes through
// claim_mission.
export interface MissionAssignmentRow {
  mission_id: string
  user_id: string
  assigned_by: string
  assigned_at: string
}
