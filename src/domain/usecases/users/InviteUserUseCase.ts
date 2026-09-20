import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidUserInputError } from '../../errors/invalid-user-input-error'
import { can } from '../../policies/can'
import type { UserRepository } from '../../repositories/user-repository'

export interface InviteUserUseCaseInput {
  actorId: string
  fullName: string
  email: string
}

// specs/web-users.md §2.5/§3 (amendement du 2026-09-18, PO-WU-01 résolu) —
// "inviter un compte". Same authorization-before-validation ordering as
// every other write use case in this backoffice: an unauthorized caller
// never learns which field would have been rejected. Club-wide action, no
// team/section scope (§3, 'admin' carries no scope field) — no context
// object needed here.
//
// §2.5/AC-WU-30 — the actual privileged work (calling
// auth.admin.inviteUserByEmail() with a service_role client, then inserting
// the public.users row) lives BEHIND UserRepository.invite(), inside
// data/'s invite-user Edge Function call. This use case carries the
// INTENT ("inviter un compte") and its business rules; it has no Supabase
// import of its own (CLAUDE.md §3/§6).
//
// §4 "Journal d'audit" — CDC §11.3 names "création/suppression compte"
// literally as an action to trace. Per CLAUDE.md §6 that belongs here (a
// business action, logged from the use case, never from a component or a
// trigger) — but no audit table/AuditRepository/write path exists anywhere
// in this codebase yet (verified against every migration), and PO-WU-07
// explicitly defers building that infrastructure to its own spec. No audit
// call is added below — flagged again here so it isn't missed at review
// time: blocked on PO-WU-07, see specs/web-users.md §4 — no audit
// infrastructure exists yet to write this "création de compte" trace to.
export class InviteUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: InviteUserUseCaseInput): Promise<void> {
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

    await this.userRepository.invite({ fullName, email })

    // blocked on PO-WU-07 — see this class's own top comment: no audit
    // infrastructure exists to write the required "création de compte"
    // trace to yet.
  }
}
