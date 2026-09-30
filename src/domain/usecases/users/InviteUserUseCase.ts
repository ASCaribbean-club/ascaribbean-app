import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidUserInputError } from '../../errors/invalid-user-input-error'
import { InvalidUserProfileInputError } from '../../errors/invalid-user-profile-input-error'
import { can } from '../../policies/can'
import { isValidUserAge } from '../../policies/user-profile-rules'
import type { Handedness } from '../../entities/user'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { InvitationLink, UserRepository } from '../../repositories/user-repository'

export interface InviteUserUseCaseInput {
  actorId: string
  fullName: string
  email: string
  age: number | null
  handedness: Handedness | null
}

// specs/web-users.md §2.5/§3 (amendement du 2026-09-18, PO-WU-01 résolu) —
// "inviter un compte". Same authorization-before-validation ordering as
// every other write use case in this backoffice: an unauthorized caller
// never learns which field would have been rejected. Club-wide action, no
// team/section scope (§3, 'admin' carries no scope field) — no context
// object needed here.
//
// specs/web-users-invitation-links.md §2 (amendement du 2026-09-18,
// remplace l'envoi d'e-mail) — the actual privileged work (calling
// auth.admin.generateLink() with a service_role client, then inserting the
// public.users row) lives BEHIND UserRepository.invite(), inside data's
// invite-user Edge Function call. This use case carries the INTENT
// ("inviter un compte") and its business rules; it has no Supabase import
// of its own (CLAUDE.md §3/§6). The activation link itself is returned,
// never sent — the application no longer emails anyone (§1).
//
// §4 "Journal d'audit" — CDC §11.3 names "création/suppression compte"
// literally as an action to trace. Per CLAUDE.md §6 that belongs here (a
// business action, logged from the use case, never from a component or a
// trigger). Follow-up pass to specs/web-audit-logs.md (2026-09-30 fourth
// addendum): the audit infrastructure PO-WU-07 was blocked on now exists
// (public.record_audit_log_entry, domain/repositories/audit-log-repository.ts's
// `record()`) and this use case emits 'user.invited' below, after the
// invitation itself has already committed (a new public.users row and a
// generated activation link both exist by then). `targetId` is the newly
// created account's id, threaded back by UserRepository.invite() via
// InvitationLink.userId — see that field's own comment for why the Edge
// Function needed widening to return it at all.
//
// Audit-write failure AFTER the invitation write has already succeeded —
// same tradeoff, and same reasoning, as AssignRoleUseCase's own top comment:
// no shared transaction across the two calls (a service_role-backed Edge
// Function call vs. a SECURITY DEFINER RPC on audit_log), so the invitation
// cannot be rolled back if the audit call fails. Caught and surfaced via
// `console.error`, never rejecting this use case's own promise — the
// business outcome (the account exists, the activation link was generated)
// already succeeded, the caller/UI should see success.
export class InviteUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: InviteUserUseCaseInput): Promise<InvitationLink> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(actor, 'user:invite')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to invite a user`)
    }

    // AC-WU-33/AC-WU-34 — rejected from the domain, before any network
    // call; the Edge Function itself repeats this check server-side
    // (defence in depth), never trusted from this layer alone.
    const fullName = input.fullName.trim()
    const email = input.email.trim()
    if (!fullName) {
      throw new InvalidUserInputError('fullName is required')
    }
    if (!email) {
      throw new InvalidUserInputError('email is required')
    }

    if (!isValidUserAge(input.age)) {
      throw new InvalidUserProfileInputError('age must be an integer between 1 and 120')
    }

    const link = await this.userRepository.invite({ fullName, email, age: input.age, handedness: input.handedness })

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'user.invited',
        targetId: link.userId,
        targetType: 'user',
        // §4 of the fourth addendum — "identifying content for 'who was
        // invited'", not excessive: an email and a name, no more.
        metadata: { email, fullName },
      })
    } catch (auditError) {
      console.error('InviteUserUseCase: failed to record user.invited audit entry', {
        actorId: input.actorId,
        targetId: link.userId,
        auditError,
      })
    }

    return link
  }
}
