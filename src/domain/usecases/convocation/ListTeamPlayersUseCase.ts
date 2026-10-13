import type { TeamRosterPlayer, TeamRosterRepository } from '../../repositories/team-roster-repository'
import { byDisplayNameAscending } from '../../rules/convocation-rules'

// specs/convocation-player-selection.md §3 — the players offered by the
// creation form's DESTINATAIRES card: every player of the target team,
// alphabetical. The RPC behind the repository is scoped to who may create a
// convocation for the team (coach, section manager, officer, admin).
export class ListTeamPlayersUseCase {
  constructor(private readonly teamRosterRepository: TeamRosterRepository) { }

  async execute(teamId: string): Promise<TeamRosterPlayer[]> {
    const players = await this.teamRosterRepository.listPlayers(teamId)
    return players.slice().sort(byDisplayNameAscending)
  }
}
