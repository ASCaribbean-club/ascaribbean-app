import { describe, expect, it } from 'vitest'
import type { CreateTeamInput, UpdateTeamInput } from '@domain/repositories/team-repository'
import type { TeamRow } from '../dto/team-dto'
import { toTeam, toTeamInsertRow, toTeamUpdateRow } from './team-mapper'

describe('toTeam', () => {
  it('maps every column', () => {
    const row: TeamRow = { id: 'team-1', name: 'Groupe A', section_id: 'section-1', season_id: 'season-1' }

    expect(toTeam(row)).toEqual({
      id: 'team-1',
      name: 'Groupe A',
      sectionId: 'section-1',
      seasonId: 'season-1',
    })
  })
})

describe('toTeamInsertRow', () => {
  it('maps every field to its snake_case column, and never includes id', () => {
    const input: CreateTeamInput = { name: 'Groupe A', sectionId: 'section-1', seasonId: 'season-1' }
    const row = toTeamInsertRow(input)

    expect(row).toEqual({ name: 'Groupe A', section_id: 'section-1', season_id: 'season-1' })
    expect(row).not.toHaveProperty('id')
  })
})

describe('toTeamUpdateRow', () => {
  it('maps every field to its snake_case column, and never includes id', () => {
    const input: UpdateTeamInput = { name: 'Groupe B', sectionId: 'section-2', seasonId: 'season-2' }
    const row = toTeamUpdateRow(input)

    expect(row).toEqual({ name: 'Groupe B', section_id: 'section-2', season_id: 'season-2' })
    expect(row).not.toHaveProperty('id')
  })
})
