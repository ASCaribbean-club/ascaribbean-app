import { ForbiddenError } from '../../errors/forbidden-error'
import { InvitationTargetNotInvitedError } from '../../errors/invitation-target-not-invited-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import { userStatus } from '../../policies/user-status'
import type { InvitationLink, UserRepository } from '../../repositories/user-repository'

export interface ReissueInvitationLinkUseCaseInput {
  actorId: string
  targetUserId: string
}

// specs/web-users-invitation-links.md §2/§4 — "Générer un nouveau lien"
// (row action, re-issue mode). Same authorization gate as InviteUserUseCase
// ('user:invite' — re-issuing is the same privileged capability as
// inviting, not a separate right), plus a rule InviteUserUseCase has no
// equivalent of: the TARGET must still be 'invited'
// (userStatus(charterAcceptedAt), domain/policies/user-status.ts — the
// SAME predicate the row's own status badge and the row action's
// visibility already use, never a second one). An already-active member
// has a password and a session; there is nothing here to re-issue. The
// row action's visibility already keeps this unreachable in the normal
// UI case, but that is UX only (CLAUDE.md §6) — the rule has to live here
// too.
export class ReissueInvitationLinkUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: ReissueInvitationLinkUseCaseInput): Promise<InvitationLink> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    if (!can(actor, 'user:invite')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to reissue an invitation link`)
    }

    const target = await this.userRepository.findById(input.targetUserId)
    if (!target) {
      throw new NotFoundError(`User not found: ${input.targetUserId}`)
    }
    if (userStatus(target.charterAcceptedAt) !== 'invited') {
      throw new InvitationTargetNotInvitedError(`User ${input.targetUserId} is not at 'invited' status`)
    }

    // blocked on PO-WU-07 — same audit gap InviteUserUseCase's own top
    // comment flags: no audit infrastructure exists yet to trace a
    // link re-issue either.
    return await this.userRepository.reissueInvitationLink(input.targetUserId)
  }
}
