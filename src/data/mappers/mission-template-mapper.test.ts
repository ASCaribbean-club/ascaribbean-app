import { describe, expect, it } from 'vitest'
import type { MissionTemplateRow } from '../dto/mission-template-row'
import {
  toMissionTemplate,
  toMissionTemplateActiveUpdateRow,
  toMissionTemplateInsertRow,
  toMissionTemplateUpdateRow,
} from './mission-template-mapper'

describe('toMissionTemplate', () => {
  it('maps every column and drops created_at', () => {
    const row: MissionTemplateRow = {
      id: 'mt-1',
      convocation_type: 'meeting',
      label: 'Apporter l’eau',
      default_capacity: 2,
      description: 'Détails',
      is_active: false,
      created_at: '2026-10-02T10:00:00.000Z',
    }

    expect(toMissionTemplate(row)).toEqual({
      id: 'mt-1',
      convocationType: 'meeting',
      label: 'Apporter l’eau',
      defaultCapacity: 2,
      description: 'Détails',
      isActive: false,
    })
  })
})

describe('toMissionTemplate description', () => {
  it('keeps a null description as null', () => {
    const row: MissionTemplateRow = { id: 'mt-2', convocation_type: 'training', label: 'Eau', default_capacity: 1, description: null, is_active: true, created_at: '2026-10-02T10:00:00.000Z' }
    expect(toMissionTemplate(row).description).toBeNull()
  })
})

describe('toMissionTemplateInsertRow', () => {
  it('maps type, label and capacity only', () => {
    const mapped = toMissionTemplateInsertRow({ convocationType: 'match', label: 'Eau', defaultCapacity: 3, description: 'Détails' })

    expect(mapped).toEqual({ convocation_type: 'match', label: 'Eau', default_capacity: 3, description: 'Détails' })
  })
})

describe('toMissionTemplateUpdateRow', () => {
  it('maps label, capacity and description only, never the type', () => {
    const mapped = toMissionTemplateUpdateRow({ label: 'Eau', defaultCapacity: 1, description: null })

    expect(Object.keys(mapped).sort()).toEqual(['default_capacity', 'description', 'label'])
  })
})

describe('toMissionTemplateActiveUpdateRow', () => {
  it('writes only is_active, in both directions', () => {
    expect(toMissionTemplateActiveUpdateRow(true)).toEqual({ is_active: true })
    expect(toMissionTemplateActiveUpdateRow(false)).toEqual({ is_active: false })
  })
})
