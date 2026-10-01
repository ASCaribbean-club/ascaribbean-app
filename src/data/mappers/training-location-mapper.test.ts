import { describe, expect, it } from 'vitest'
import type { TrainingLocationRow } from '../dto/training-location-row'
import { toTrainingLocation, toTrainingLocationArchiveUpdateRow, toTrainingLocationWriteRow } from './training-location-mapper'

describe('toTrainingLocation', () => {
  it('maps every column and drops created_at', () => {
    const row: TrainingLocationRow = {
      id: 'loc-1',
      name: 'Terrain A',
      address: '1 rue du Stade',
      is_archived: false,
      created_at: '2026-10-01T10:00:00.000Z',
    }

    expect(toTrainingLocation(row)).toEqual({ id: 'loc-1', name: 'Terrain A', address: '1 rue du Stade', isArchived: false })
  })

  it('maps an archived row', () => {
    expect(
      toTrainingLocation({ id: 'loc-2', name: 'Salle B', address: '2 avenue du Parc', is_archived: true }).isArchived,
    ).toBe(true)
  })
})

describe('toTrainingLocationWriteRow', () => {
  it('maps exactly name and address, never is_archived/id/created_at', () => {
    const mapped = toTrainingLocationWriteRow({ name: 'Terrain A', address: '1 rue du Stade' })

    expect(mapped).toEqual({ name: 'Terrain A', address: '1 rue du Stade' })
    expect(Object.keys(mapped).sort()).toEqual(['address', 'name'])
  })
})

describe('toTrainingLocationArchiveUpdateRow', () => {
  it('writes only is_archived = true', () => {
    expect(toTrainingLocationArchiveUpdateRow()).toEqual({ is_archived: true })
  })
})
