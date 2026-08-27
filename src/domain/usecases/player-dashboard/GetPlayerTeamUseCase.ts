import type { Team } from '../../entities/team'
import type { TeamRepository } from '../../repositories/team-repository'

export interface GetPlayerTeamInput {
  // The 'player' RoleAssignment's teamId (domain/entities/user.ts) — one
  // team per player, unlike coach's teamIds array consumed by
  // GetCoachTeamsUseCase (domain/usecases/coach-dashboard/).
  teamId: string
}

// Resolves the player's own team for the header's informational team pill
// (specs/player-dashboard.md UI design §"Structure de l'écran" point 1 —
// "purement informative", never a selector). Deliberately doesn't return an
// activeMemberCount like GetCoachTeamsUseCase's CoachTeamSummary: this
// screen has no "{équipe} · {N} licenciés · J{repère}" context line (§1,
// "pas de ligne de contexte... rien ne fonde un tel repère pour le
// joueur") — don't copy that field over just because the coach version has it.
export class GetPlayerTeamUseCase {
  constructor(private readonly teamRepository: TeamRepository) { }

  async execute(_input: GetPlayerTeamInput): Promise<Team | null> {
    return this.teamRepository.findById(_input.teamId)
  }
}
