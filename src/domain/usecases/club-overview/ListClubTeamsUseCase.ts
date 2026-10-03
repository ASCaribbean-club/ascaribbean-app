import type { Team } from '../../entities/team'
import type { ClubScheduleRepository } from '../../repositories/club-schedule-repository'

// Teams of the current season, for the Dirigeant's Section -> Équipe picker
// in the convocation form (§1.4). Narrowing to one section is the pure rule
// filterTeamsBySection.
export class ListClubTeamsUseCase {
  constructor(private readonly clubScheduleRepository: ClubScheduleRepository) {}

  execute(): Promise<Team[]> {
    return this.clubScheduleRepository.listCurrentSeasonTeams()
  }
}
