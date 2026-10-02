import type { ConvocationMission, ConvocationMissionWithAssignees, MissionAssignment } from '@domain/entities/convocation-mission'
import type { NewAdHocMission } from '@domain/repositories/convocation-mission-repository'
import type { ConvocationMissionAdHocInsertRow, ConvocationMissionRow } from '../dto/convocation-mission-row'
import type { ConvocationMissionListDto } from '../dto/convocation-mission-list-dto'
import type { MissionAssignmentRow } from '../dto/mission-assignment-row'

export function toConvocationMission(row: ConvocationMissionRow): ConvocationMission {
  return {
    id: row.id,
    convocationId: row.convocation_id,
    templateId: row.template_id,
    label: row.label,
    capacity: row.capacity,
  }
}

export function toMissionAssignment(row: MissionAssignmentRow): MissionAssignment {
  return {
    missionId: row.mission_id,
    userId: row.user_id,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
  }
}

export function toAdHocMissionInsertRow(input: NewAdHocMission): ConvocationMissionAdHocInsertRow {
  return {
    convocation_id: input.convocationId,
    template_id: null,
    label: input.label,
    capacity: input.capacity,
  }
}

// Groups the flat RPC rows into one entry per mission, keeping the order of
// first appearance (the RPC orders them) and dropping the null-assignee row
// of an empty mission.
export function toConvocationMissionsWithAssignees(rows: ConvocationMissionListDto[]): ConvocationMissionWithAssignees[] {
  const byMission = new Map<string, ConvocationMissionWithAssignees>()

  for (const row of rows) {
    let entry = byMission.get(row.mission_id)
    if (!entry) {
      entry = {
        mission: {
          id: row.mission_id,
          convocationId: row.convocation_id,
          templateId: row.template_id,
          label: row.label,
          capacity: row.capacity,
        },
        assignees: [],
      }
      byMission.set(row.mission_id, entry)
    }

    if (row.user_id !== null && row.assigned_by !== null && row.assigned_at !== null) {
      entry.assignees.push({
        missionId: row.mission_id,
        userId: row.user_id,
        assignedBy: row.assigned_by,
        assignedAt: row.assigned_at,
        displayName: row.display_name ?? '',
      })
    }
  }

  return [...byMission.values()]
}
