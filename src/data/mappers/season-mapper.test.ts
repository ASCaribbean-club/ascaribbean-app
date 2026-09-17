import { describe, expect, it } from 'vitest'
import type { CreateSeasonInput, UpdateSeasonInput } from '@domain/repositories/season-repository'
import type { SeasonRow } from '../dto/season-dto'
import { toSeason, toSeasonInsertRow, toSeasonUpdateRow } from './season-mapper'

describe('toSeason', () => {
  it('maps every column', () => {
    const row: SeasonRow = {
      id: 'season-1',
      label: '2026-2027',
      start_date: '2026-08-01',
      end_date: '2027-06-30',
    }

    expect(toSeason(row)).toEqual({
      id: 'season-1',
      label: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-06-30',
    })
  })

  it('maps a different row without cross-contamination between fields', () => {
    const row: SeasonRow = {
      id: 'season-2',
      label: '2025-2026',
      start_date: '2025-09-01',
      end_date: '2026-06-30',
    }

    const result = toSeason(row)

    expect(result.id).toBe('season-2')
    expect(result.label).toBe('2025-2026')
    expect(result.startDate).toBe('2025-09-01')
    expect(result.endDate).toBe('2026-06-30')
  })
})

describe('toSeasonInsertRow', () => {
  it('maps every field to its snake_case column, and never includes season_range', () => {
    const input: CreateSeasonInput = {
      label: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-06-30',
    }

    const row = toSeasonInsertRow(input)

    expect(row).toEqual({
      label: '2026-2027',
      start_date: '2026-08-01',
      end_date: '2027-06-30',
    })
    expect(row).not.toHaveProperty('season_range')
    expect(row).not.toHaveProperty('id')
  })
})

describe('toSeasonUpdateRow', () => {
  it('maps every field to its snake_case column, and never includes season_range', () => {
    const input: UpdateSeasonInput = {
      label: '2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
    }

    const row = toSeasonUpdateRow(input)

    expect(row).toEqual({
      label: '2025-2026',
      start_date: '2025-09-01',
      end_date: '2026-06-30',
    })
    expect(row).not.toHaveProperty('season_range')
    expect(row).not.toHaveProperty('id')
  })
})
