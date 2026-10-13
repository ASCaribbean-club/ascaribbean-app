import type { ConvocationRespondersRepository, ConvocationTeamPlayer } from '../../repositories/convocation-responders-repository'
import { byDisplayNameAscending } from '../../rules/convocation-rules'

// specs/convocation-player-selection.md AC-CPS-12 — the players of the
// convocation's team, convoked or not, alphabetical. Backs the missions member
// picker: missions stay open to every player of the team.
export class ListConvocationTeamPlayersUseCase {
  constructor(private readonly convocationRespondersRepository: ConvocationRespondersRepository) { }

  async execute(convocationId: string): Promise<ConvocationTeamPlayer[]> {
    const players = await this.convocationRespondersRepository.listTeamPlayers(convocationId)
    return players.slice().sort(byDisplayNameAscending)
  }
}
