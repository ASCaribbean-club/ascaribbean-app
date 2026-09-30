import type { Opponent } from '../../entities/opponent'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidOpponentInputError } from '../../errors/invalid-opponent-input-error'
import { can } from '../../policies/can'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface AddOpponentToTeamUseCaseInput {
  actorId: string
  // The club team CHOSEN in the dialog's select, which may differ from the
  // row the dialog was opened from (specs/team-opponents.md §2.2).
  teamId: string
  name: string
}

// specs/team-opponents.md §2.3/§2.6/AC-TO-07/AC-TO-08 — gated on the existing
// 'team:write' action (no new rbac-matrix entry), validates and trims the
// name BEFORE any network call, then delegates to the repository's single
// atomic "find or create, then link" call.
//
// No audit entry is emitted (PO-TO-05, open): this spec adds no audit action
// code.
export class AddOpponentToTeamUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly opponentRepository: OpponentRepository,
  ) {}

  async execute(input: AddOpponentToTeamUseCaseInput): Promise<Opponent> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'team:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to add an opponent to a team`)
    }

    const name = input.name.trim()
    if (!name) {
      throw new InvalidOpponentInputError('name is required')
    }
    if (!input.teamId) {
      throw new InvalidOpponentInputError('teamId is required')
    }

    return this.opponentRepository.addToTeam(input.teamId, name)
  }
}
