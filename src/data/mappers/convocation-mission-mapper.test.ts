import { describe, expect, it } from 'vitest'
import type { ConvocationMissionListDto } from '../dto/convocation-mission-list-dto'
import {
  toAdHocMissionInsertRow,
  toConvocationMission,
  toConvocationMissionsWithAssignees,
  toMissionAssignment,
} from './convocation-mission-mapper'

describe('toConvocationMission', () => {
  it('maps every column, template_id included', () => {
    expect(toConvocationMission({ id: 'm1', convocation_id: 'c1', template_id: 't1', label: 'Eau', capacity: 2 })).toEqual({
      id: 'm1',
      convocationId: 'c1',
      templateId: 't1',
      label: 'Eau',
      capacity: 2,
    })
  })

  it('keeps a null template_id as null (ad hoc mission)', () => {
    expect(toConvocationMission({ id: 'm1', convocation_id: 'c1', template_id: null, label: 'Eau', capacity: 1 }).templateId).toBeNull()
  })
})

describe('toMissionAssignment', () => {
  it('maps every column', () => {
    expect(toMissionAssignment({ mission_id: 'm1', user_id: 'u1', assigned_by: 'u2', assigned_at: '2026-10-02T10:00:00.000Z' })).toEqual({
      missionId: 'm1',
      userId: 'u1',
      assignedBy: 'u2',
      assignedAt: '2026-10-02T10:00:00.000Z',
    })
  })
})

describe('toAdHocMissionInsertRow', () => {
  it('always writes a null template_id and never an id', () => {
    expect(toAdHocMissionInsertRow({ convocationId: 'c1', label: 'Barrières', capacity: 3 })).toEqual({
      convocation_id: 'c1',
      template_id: null,
      label: 'Barrières',
      capacity: 3,
    })
  })
})

describe('toConvocationMissionsWithAssignees', () => {
  const mission = { convocation_id: 'c1', template_id: null, capacity: 2 }

  it('groups rows per mission, keeps order, and gives an empty mission no assignee', () => {
    const rows: ConvocationMissionListDto[] = [
      { ...mission, mission_id: 'm1', label: 'A', user_id: 'u1', display_name: 'Membre 1', assigned_by: 'u1', assigned_at: '2026-10-02T10:00:00.000Z' },
      { ...mission, mission_id: 'm1', label: 'A', user_id: 'u2', display_name: 'Membre 2', assigned_by: 'u3', assigned_at: '2026-10-02T11:00:00.000Z' },
      { ...mission, mission_id: 'm2', label: 'B', user_id: null, display_name: null, assigned_by: null, assigned_at: null },
    ]

    const result = toConvocationMissionsWithAssignees(rows)

    expect(result.map((entry) => entry.mission.id)).toEqual(['m1', 'm2'])
    expect(result[0].assignees).toEqual([
      { missionId: 'm1', userId: 'u1', assignedBy: 'u1', assignedAt: '2026-10-02T10:00:00.000Z', displayName: 'Membre 1' },
      { missionId: 'm1', userId: 'u2', assignedBy: 'u3', assignedAt: '2026-10-02T11:00:00.000Z', displayName: 'Membre 2' },
    ])
    expect(result[1].assignees).toEqual([])
  })

  it('returns an empty array for no row', () => {
    expect(toConvocationMissionsWithAssignees([])).toEqual([])
  })
})
