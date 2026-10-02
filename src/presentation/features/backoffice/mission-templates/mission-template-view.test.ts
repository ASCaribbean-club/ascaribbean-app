import { describe, expect, it } from 'vitest'
import type { MissionTemplate } from '@domain/entities/mission-template'
import { formatMissionCapacity, missionDescriptionToShow, missionTypeLabel, selectMissionRows } from './mission-template-view'

function template(id: string, overrides: Partial<MissionTemplate> = {}): MissionTemplate {
  return { id, convocationType: 'training', label: id, defaultCapacity: 1, description: null, isActive: true, ...overrides }
}

describe('selectMissionRows', () => {
  it('keeps only the requested type', () => {
    const rows = selectMissionRows([template('a'), template('b', { convocationType: 'match' })], 'match')
    expect(rows.map((row) => row.id)).toEqual(['b'])
  })

  it('lists active rows first then inactive, keeping creation order inside each group', () => {
    const rows = selectMissionRows(
      [template('a', { isActive: false }), template('b'), template('c', { isActive: false }), template('d')],
      'training',
    )
    expect(rows.map((row) => row.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('keeps a type whose rows are all inactive non-empty', () => {
    expect(selectMissionRows([template('a', { isActive: false })], 'training')).toHaveLength(1)
  })

  it('returns an empty list for a type without templates', () => {
    expect(selectMissionRows([template('a')], 'meeting')).toEqual([])
  })
})

describe('formatMissionCapacity', () => {
  it('uses the singular for 1 and the plural otherwise', () => {
    expect(formatMissionCapacity(1)).toBe('1 personne')
    expect(formatMissionCapacity(2)).toBe('2 personnes')
    expect(formatMissionCapacity(3)).toBe('3 personnes')
  })
})

describe('missionTypeLabel', () => {
  it('returns the French label of each type', () => {
    expect(missionTypeLabel('training')).toBe('Entraînement')
    expect(missionTypeLabel('match')).toBe('Match')
    expect(missionTypeLabel('meeting')).toBe('Réunion')
  })
})

describe('missionDescriptionToShow', () => {
  it('returns null when the description is absent or blank', () => {
    expect(missionDescriptionToShow(null)).toBeNull()
    expect(missionDescriptionToShow('   ')).toBeNull()
  })

  it('returns the trimmed description otherwise', () => {
    expect(missionDescriptionToShow(' Penser aux gourdes ')).toBe('Penser aux gourdes')
  })
})
