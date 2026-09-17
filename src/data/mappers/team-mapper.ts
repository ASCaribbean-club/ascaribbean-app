import type { Team } from '@domain/entities/team'
import type { CreateTeamInput, UpdateTeamInput } from '@domain/repositories/team-repository'
import type { TeamInsertRow, TeamRow, TeamUpdateRow } from '../dto/team-dto'

export function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    sectionId: row.section_id,
    seasonId: row.season_id,
  }
}

// specs/section-and-teams.md §2.7 — the reverse direction, input -> row,
// needed by TeamRepositoryImpl.create() (CLAUDE.md §4).
export function toTeamInsertRow(input: CreateTeamInput): TeamInsertRow {
  return {
    name: input.name,
    section_id: input.sectionId,
    season_id: input.seasonId,
  }
}

// Same reverse mapping for TeamRepositoryImpl.update().
export function toTeamUpdateRow(input: UpdateTeamInput): TeamUpdateRow {
  return {
    name: input.name,
    section_id: input.sectionId,
    season_id: input.seasonId,
  }
}
