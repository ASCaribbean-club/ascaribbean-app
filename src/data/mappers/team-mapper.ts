import type { Team } from '@domain/entities/team'
import type { TeamRow } from '../dto/team-dto'

export function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    sectionId: row.section_id,
    seasonId: row.season_id,
  }
}
