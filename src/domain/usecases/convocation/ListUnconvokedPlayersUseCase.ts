import type { ConvocationRespondersRepository, ConvocationTeamPlayer } from '../../repositories/convocation-responders-repository'
import { byDisplayNameAscending } from '../../rules/convocation-rules'

// specs/convocation-player-selection.md §4 — the players of the team who are
// NOT on the list of convoked players yet: the choices offered by the
// "Convoquer un joueur" panel. Pure set difference of two reads; the database
// stays the authority on what can actually be added.
export class ListUnconvokedPlayersUseCase {
  constructor(private readonly convocationRespondersRepository: ConvocationRespondersRepository) { }

  async execute(convocationId: string): Promise<ConvocationTeamPlayer[]> {
    const [teamPlayers, convoked] = await Promise.all([
      this.convocationRespondersRepository.listTeamPlayers(convocationId),
      this.convocationRespondersRepository.listForConvocation(convocationId),
    ])
    const convokedIds = new Set(convoked.map((responder) => responder.userId))
    return teamPlayers.filter((player) => !convokedIds.has(player.userId)).sort(byDisplayNameAscending)
  }
}
