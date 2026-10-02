// specs/match-details-missions.md §2.1/§2.4 — a mission of one convocation,
// copied from an active MissionTemplate at creation time (snapshot: `label`
// and `capacity` are never read back from the template). `templateId` is
// null for an ad hoc mission added by a manager.
export interface ConvocationMission {
  id: string
  convocationId: string
  templateId: string | null
  label: string
  capacity: number
}

// Current-state row (CLAUDE.md §6): one per (mission, user), removed on
// release. `assignedBy` equals `userId` for a self-registration.
export interface MissionAssignment {
  missionId: string
  userId: string
  assignedBy: string
  assignedAt: string // ISO timestamp
}

// Read model: an assignment together with the assignee's display name.
export interface MissionAssignee extends MissionAssignment {
  displayName: string
}

// Read model of one mission with everyone registered on it.
export interface ConvocationMissionWithAssignees {
  mission: ConvocationMission
  assignees: MissionAssignee[]
}
