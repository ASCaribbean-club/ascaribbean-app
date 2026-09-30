import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import { PasswordResetTargetNotActiveError } from '../../errors/password-reset-target-not-active-error'
import { can } from '../../policies/can'
import { userStatus } from '../../policies/user-status'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
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
//
// §4 "Journal d'audit" — follow-up pass to specs/web-audit-logs.md
// (2026-09-30 fourth addendum): the audit infrastructure PO-WU-07 was
// blocked on now exists (public.record_audit_log_entry,
// domain/repositories/audit-log-repository.ts's `record()`) and this use
// case emits 'password_reset.issued' below, after the link itself has
// already been generated. `targetId` is `input.targetUserId` — already
// known, unlike InviteUserUseCase's own targetId which needed the Edge
// Function widened to hand back an id that didn't exist before the call.
//
// Audit-write failure AFTER the link-generation write has already
// succeeded — same tradeoff, and same reasoning, as AssignRoleUseCase's own
// top comment: caught and surfaced via `console.error`, never rejecting
// this use case's own promise — the business outcome (a fresh recovery
// link exists) already succeeded, the caller/UI should see success.
export class GeneratePasswordResetLinkUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

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

    const link = await this.userRepository.generatePasswordResetLink(input.targetUserId)

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'password_reset.issued',
        targetId: input.targetUserId,
        targetType: 'user',
        metadata: {},
      })
    } catch (auditError) {
      console.error('GeneratePasswordResetLinkUseCase: failed to record password_reset.issued audit entry', {
        actorId: input.actorId,
        targetId: input.targetUserId,
        auditError,
      })
    }

    return link
  }
}
