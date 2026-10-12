import type { VoteCategoryId } from '@domain/entities/vote'
import type { TeamMvpRepository } from '@domain/repositories/team-mvp-repository'

export interface GetTeamMvpInput {
  teamId: string
  categoryId: VoteCategoryId
}

// Thin pass-through, like GetVoteTallyUseCase: "latest closed vote" is
// resolved server-side (get_team_mvp), mirroring player-vote-rules.ts's
// voting deadline. No RBAC entry — RLS-only read of an aggregate.
export class GetTeamMvpUseCase {
  constructor(private readonly teamMvpRepository: TeamMvpRepository) {}

  async execute(input: GetTeamMvpInput): Promise<string[]> {
    return this.teamMvpRepository.getCurrentMvpIds(input.teamId, input.categoryId)
  }
}
