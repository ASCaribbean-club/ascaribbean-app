import type { Membership } from '../../entities/membership'
import { ForbiddenError } from '../../errors/forbidden-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface ArchiveMembershipUseCaseInput {
  actorId: string
  membershipId: string
}

// specs/web-memberships.md §2.5/AC-WM-05 — a SOFT delete: sets
// archived_at/archived_by, never a DELETE (no delete policy exists or is
// added on this table). §4 — this is exactly the class of action CLAUDE.md
// §6 says belongs to a use case, not a Postgres trigger ("une action qui
// soustrait une situation financière de la vue courante"). Follow-up pass to
// specs/web-audit-logs.md (2026-09-30 fourth addendum): the audit
// infrastructure PO-WM-09 was blocked on now exists
// (public.record_audit_log_entry, domain/repositories/audit-log-repository.ts's
// `record()`) and this use case emits 'membership.archived' below, after
// the archive write itself has already committed. No metadata beyond the
// row itself already says (§4 of the fourth addendum): the row's own
// archived_at/archived_by already carry when/who, this trace just adds
// "this membership was archived" to the timeline.
//
// Audit-write failure AFTER the archive write has already succeeded — same
// tradeoff, and same reasoning, as AssignRoleUseCase's own top comment: no
// shared transaction across the two calls (client-RLS-gated UPDATE on
// memberships vs. a SECURITY DEFINER RPC on audit_log), so the archive
// cannot be rolled back if the audit call fails. Caught and surfaced via
// `console.error`, never rejecting this use case's own promise — the
// business outcome (the membership is archived) already succeeded, the
// caller/UI should see success.
export class ArchiveMembershipUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ArchiveMembershipUseCaseInput): Promise<Membership> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'membership:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write memberships`)
    }

    const membership = await this.membershipRepository.archive(input.membershipId, user.id)

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'membership.archived',
        targetId: input.membershipId,
        targetType: 'membership',
        metadata: {},
      })
    } catch (auditError) {
      console.error('ArchiveMembershipUseCase: failed to record membership.archived audit entry', {
        actorId: input.actorId,
        targetId: input.membershipId,
        auditError,
      })
    }

    return membership
  }
}
