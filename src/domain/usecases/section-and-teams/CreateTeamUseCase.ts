import type { Team } from '../../entities/team'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTeamInputError } from '../../errors/invalid-team-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { TeamRepository } from '../../repositories/team-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface CreateTeamUseCaseInput {
  actorId: string
  name: string
  sectionId: string
  seasonId: string
}

// specs/section-and-teams.md §2.2/§3/AC-ST-11 — "Section et saison sont
// obligatoires : une équipe est propre à une saison et n'est jamais
// réutilisée d'une saison à l'autre" (the mockup's own italic copy, a
// business rule, not decoration). This use case refuses a team with no
// section or no season BEFORE any network call, backed at the database
// level by the `not null` constraints this same pass adds to
// teams.section_id/season_id (§2.2, AC-ST-05).
// specs/web-audit-logs.md — 2026-09-30 (fifth addendum, deliberate scope
// widening beyond "sensitive actions only") — this use case emits
// 'team.created' below, after the team itself has already committed.
//
// Audit-write failure AFTER the team write has already succeeded — same
// tradeoff, and same reasoning, as AssignRoleUseCase's own top comment: no
// shared transaction across the two calls (client-RLS-gated INSERT on
// teams vs. a SECURITY DEFINER RPC on audit_log), so the team write cannot
// be rolled back if the audit call fails. Caught and surfaced via
// `console.error`, never rejecting this use case's own promise — the
// business outcome (the team is created) already succeeded, the caller/UI
// should see success.
export class CreateTeamUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: CreateTeamUseCaseInput): Promise<Team> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'team:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write teams`)
    }

    const name = input.name.trim()
    if (!name) {
      throw new InvalidTeamInputError('name is required')
    }
    if (!input.sectionId) {
      throw new InvalidTeamInputError('sectionId is required')
    }
    if (!input.seasonId) {
      throw new InvalidTeamInputError('seasonId is required')
    }

    const team = await this.teamRepository.create({
      name,
      sectionId: input.sectionId,
      seasonId: input.seasonId,
    })

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'team.created',
        targetId: team.id,
        targetType: 'team',
        metadata: { name: input.name, sectionId: input.sectionId, seasonId: input.seasonId },
      })
    } catch (auditError) {
      console.error('CreateTeamUseCase: failed to record team.created audit entry', {
        actorId: input.actorId,
        targetId: team.id,
        auditError,
      })
    }

    return team
  }
}
