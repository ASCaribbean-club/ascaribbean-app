import type { Membership } from '../../entities/membership'
import { ForbiddenError } from '../../errors/forbidden-error'
import { can } from '../../policies/can'
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
// soustrait une situation financière de la vue courante"): the actual audit
// LOG call is not wired here (PO-WM-09, open — no audit infrastructure
// exists anywhere in this repo yet, §1/§4 "hors périmètre"), but this is
// exactly where that call would go once PO-WM-09 is resolved.
export class ArchiveMembershipUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: ArchiveMembershipUseCaseInput): Promise<Membership> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'membership:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write memberships`)
    }

    return this.membershipRepository.archive(input.membershipId, user.id)
  }
}
