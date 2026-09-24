import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import { PasswordResetTargetNotActiveError } from '../../errors/password-reset-target-not-active-error'
import { can } from '../../policies/can'
import { userStatus } from '../../policies/user-status'
import type { InvitationLink, UserRepository } from '../../repositories/user-repository'

export interface GeneratePasswordResetLinkUseCaseInput {
  actorId: string
  targetUserId: string
}

// specs/web-users-invitation-links.md §2/§4 — "Réinitialiser le mot de
// passe" (row action, admin-mediated — CLAUDE.md §7 "no service_role key
// reachable client-side" rules out a member-triggered
// supabase.auth.resetPasswordForEmail() from ever sending mail itself; this
// mirrors ReissueInvitationLinkUseCase's own shape instead). Same
// authorization gate as InviteUserUseCase/ReissueInvitationLinkUseCase
// ('user:invite' — granting fresh account access is the same privileged
// capability whichever link is being generated, not a separate right),
// plus the mirror-image rule of ReissueInvitationLinkUseCase's own: the
// TARGET must be 'active' (userStatus(charterAcceptedAt), same predicate
// the row's own status badge and the row action's visibility already use).
// An 'invited' account has no password to reset — it needs an activation
// link instead.
export class GeneratePasswordResetLinkUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: GeneratePasswordResetLinkUseCaseInput): Promise<InvitationLink> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    if (!can(actor, 'user:invite')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to generate a password reset link`)
    }

    const target = await this.userRepository.findById(input.targetUserId)
    if (!target) {
      throw new NotFoundError(`User not found: ${input.targetUserId}`)
    }
    if (userStatus(target.charterAcceptedAt) !== 'active') {
      throw new PasswordResetTargetNotActiveError(`User ${input.targetUserId} is not at 'active' status`)
    }

    // blocked on PO-WU-07 — same audit gap InviteUserUseCase's own top
    // comment flags: no audit infrastructure exists yet to trace a
    // password-reset link generation either.
    return await this.userRepository.generatePasswordResetLink(input.targetUserId)
  }
}
