import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidCoachAssignmentInputError } from '../../errors/invalid-coach-assignment-input-error'
import { can } from '../../policies/can'
import type { RoleAssignmentRepository } from '../../repositories/role-assignment-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface AssignCoachToTeamsUseCaseInput {
  actorId: string
  userId: string
  teamIds: string[]
}

// specs/section-and-teams.md §2.9/§2.10/§3/AC-ST-40 — writes public.user_roles,
// never public.teams/public.sections (§2.9). Always inserts role='coach' and
// section_id=null, regardless of what presentation/ sends — there is no
// `role`/`sectionId` field anywhere on AssignCoachToTeamsUseCaseInput for
// exactly that reason, not merely a runtime check that could be bypassed by
// a different caller.
//
// §2.10/AC-ST-36 — idempotent: re-submitting a team the userId is already
// coaching is absorbed by RoleAssignmentRepository.assignCoachToTeams, never
// surfaced here as an error.
//
// §4 "Journal d'audit — ce n'est plus une question ouverte, c'est une
// exigence" — CDC §11.3 requires a "changement de rôle" to be traced, and
// assigning a coach is exactly that. Per CLAUDE.md §6 this belongs here (a
// business action, logged from the use case, never from a component or a
// trigger) — but no audit table, AuditRepository, or write path exists
// anywhere in this codebase yet (verified: no migration creates one), and
// PO-ST-14 explicitly defers designing that infrastructure to its own spec.
// No audit call is added below — adding one against nothing would either
// silently no-op or invent a schema this spec was told not to invent (§4,
// "cette spec ne conçoit pas la table d'audit"). AC-ST-37 marks this
// blocking for PRODUCTION, not for building this use case — flagged again
// in this class's own JSDoc so it isn't missed at review time:
// blocked on PO-ST-14, see specs/section-and-teams.md §4 — no audit
// infrastructure exists yet to write this "changement de rôle" trace to.
export class AssignCoachToTeamsUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleAssignmentRepository: RoleAssignmentRepository,
  ) {}

  async execute(input: AssignCoachToTeamsUseCaseInput): Promise<void> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(actor, 'role:assign-coach')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to assign a coach`)
    }

    // AC-ST-40 — rejected from the domain, before any network call: a
    // missing account, or submitting with no team checked at all.
    if (!input.userId) {
      throw new InvalidCoachAssignmentInputError('userId is required')
    }
    if (input.teamIds.length === 0) {
      throw new InvalidCoachAssignmentInputError('at least one team must be selected')
    }

    await this.roleAssignmentRepository.assignCoachToTeams(input.userId, input.teamIds)

    // blocked on PO-ST-14 — see this class's own top comment: no audit
    // infrastructure exists to write the required "changement de rôle"
    // trace to yet.
  }
}
