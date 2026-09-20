import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFullNameInputError } from '../../errors/invalid-full-name-input-error'
import { can } from '../../policies/can'
import type { UserRepository } from '../../repositories/user-repository'

export interface UpdateUserFullNameUseCaseInput {
  actorId: string
  userId: string
  fullName: string
}

// specs/web-users.md §2.7/§3 (PO-WU-02 résolu) — "Modifier l'utilisateur".
// Writes full_name ONLY, never email — the dialog renders the EMAIL field
// too, but this use case's own input has no email field to leak: the same
// "the type documents the guarantee instead of merely a runtime check"
// reasoning already used for AssignCoachToTeamsUseCase's hard-coded
// role/sectionId. Club-wide action, no team/section scope (§3, 'admin'
// carries no scope field) — no context object needed here.
//
// §4 "Journal d'audit" — CDC §11.3 names "changement de rôle" but NOT a
// generic profile edit; a rename isn't one of the two actions this pass
// flags as newly-pressing (§4). No audit call is added regardless — same
// "no infrastructure exists yet" position as InviteUserUseCase/
// AssignRoleUseCase, PO-WU-07/PO-WU-08 track this, not this class.
export class UpdateUserFullNameUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: UpdateUserFullNameUseCaseInput): Promise<void> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(actor, 'user:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write users`)
    }

    // AC-WU-38 — rejected from the domain, before any network call. The
    // users_update_admin RLS policy repeats this at the database level via
    // `not null`/`check` on the column itself (defence in depth).
    const fullName = input.fullName.trim()
    if (!fullName) {
      throw new InvalidFullNameInputError('fullName is required')
    }
    if (!input.userId) {
      throw new InvalidFullNameInputError('userId is required')
    }

    await this.userRepository.updateFullName(input.userId, fullName)
  }
}
