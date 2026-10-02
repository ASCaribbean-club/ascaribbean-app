import type { ConvocationMission, ConvocationMissionWithAssignees, MissionAssignment } from '../entities/convocation-mission'

export interface NewAdHocMission {
  convocationId: string
  label: string
  capacity: number
}

// specs/match-details-missions.md §2.4. Missions of a convocation and their
// assignments. Creation from templates is NOT here: it happens inside the
// create_*_convocation RPCs (invisible to the domain).
export interface ConvocationMissionRepository {
  // Every mission of the convocation with its assignees. RLS-scoped; an
  // out-of-scope convocation resolves to an empty array.
  listForConvocation(convocationId: string): Promise<ConvocationMissionWithAssignees[]>
  // Registers `userId` through the claim_mission RPC (the ONLY insert path:
  // counts and inserts in one transaction). Throws MissionFullError when the
  // mission is full.
  claim(missionId: string, userId: string): Promise<MissionAssignment>
  // Removes the (mission, user) assignment.
  release(missionId: string, userId: string): Promise<void>
  addAdHoc(input: NewAdHocMission): Promise<ConvocationMission>
  // Assignments go with it (cascade).
  remove(missionId: string): Promise<void>
}
