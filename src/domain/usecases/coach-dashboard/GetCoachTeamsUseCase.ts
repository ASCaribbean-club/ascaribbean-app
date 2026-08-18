import type { Team } from '../../entities/team'
import type { TeamRepository } from '../../repositories/team-repository'

export interface GetCoachTeamsInput {
  // The coach's teamIds, as carried by the { role: 'coach', teamIds } branch
  // of User.roles (see domain/entities/user.ts) — this use case doesn't read
  // User itself, it only turns ids into Team summaries.
  coachTeamIds: string[]
}

export interface CoachTeamSummary {
  team: Team
  activeMemberCount: number
}

// Get coach {team, activeMembers} list
export class GetCoachTeamsUseCase {
  private readonly teamRepository: TeamRepository

  constructor(teamRepository: TeamRepository) {
    this.teamRepository = teamRepository
  }

  async execute(_input: GetCoachTeamsInput): Promise<CoachTeamSummary[]> {
    var teams = await this.teamRepository.findByIds(_input.coachTeamIds) // Team list

    const summaries = await Promise.all(
      teams.map(async (team) => {
        const activeMemberCount = await this.teamRepository.countActiveMembers(team.id)
        return { team, activeMemberCount }
      })
    )

    return summaries
  }
}
