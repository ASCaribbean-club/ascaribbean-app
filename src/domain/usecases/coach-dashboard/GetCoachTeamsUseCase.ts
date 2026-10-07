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
  rosterMemberCount: number
}

// Get coach {team, activeMembers} list
export class GetCoachTeamsUseCase {
  private readonly teamRepository: TeamRepository

  constructor(teamRepository: TeamRepository) {
    this.teamRepository = teamRepository
  }

  async execute(_input: GetCoachTeamsInput): Promise<CoachTeamSummary[]> {
    const teams = await this.teamRepository.findByIds(_input.coachTeamIds)

    const summaries = await Promise.all(
      teams.map(async (team) => {
        const [activeMemberCount, rosterMemberCount] = await Promise.all([
          this.teamRepository.countActiveMembers(team.id),
          this.teamRepository.countRosterMembers(team.id),
        ])
        return { team, activeMemberCount, rosterMemberCount }
      })
    )

    return summaries
  }
}
