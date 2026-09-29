import type { TeamRosterPlayer } from '@domain/repositories/team-roster-repository'
import type { TeamRosterPlayerDto } from '@data/dto/team-roster-dto'

export function toTeamRosterPlayer(dto: TeamRosterPlayerDto): TeamRosterPlayer {
  return {
    userId: dto.user_id,
    displayName: dto.full_name,
  }
}
