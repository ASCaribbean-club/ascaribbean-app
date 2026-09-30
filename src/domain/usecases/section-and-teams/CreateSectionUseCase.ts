import { SECTION_TYPES, type Section, type SectionType } from '../../entities/section'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSectionInputError } from '../../errors/invalid-section-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { SectionRepository } from '../../repositories/section-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface CreateSectionUseCaseInput {
  actorId: string
  name: string
  type: string
}

// specs/section-and-teams.md §2.5/§3/AC-ST-11 — same authorization-before-
// validation ordering as CreateSeasonUseCase: an unauthorized caller never
// learns which field would have been rejected. Club-wide action, no
// team/section scope needed in the can() call ('admin' carries no scope
// field, §3) — no context object needed here.
// specs/web-audit-logs.md — 2026-09-30 (fifth addendum, deliberate scope
// widening beyond "sensitive actions only") — this use case emits
// 'section.created' below, after the section itself has already committed.
//
// Audit-write failure AFTER the section write has already succeeded — same
// tradeoff, and same reasoning, as AssignRoleUseCase's own top comment: no
// shared transaction across the two calls (client-RLS-gated INSERT on
// sections vs. a SECURITY DEFINER RPC on audit_log), so the section write
// cannot be rolled back if the audit call fails. Caught and surfaced via
// `console.error`, never rejecting this use case's own promise — the
// business outcome (the section is created) already succeeded, the
// caller/UI should see success.
export class CreateSectionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sectionRepository: SectionRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: CreateSectionUseCaseInput): Promise<Section> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'section:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write sections`)
    }

    // AC-ST-11 — rejected from the domain (DomainError, not a
    // component-level check), before any network call.
    const name = input.name.trim()
    if (!name) {
      throw new InvalidSectionInputError('name is required')
    }
    if (!SECTION_TYPES.includes(input.type as SectionType)) {
      throw new InvalidSectionInputError(`type must be one of ${SECTION_TYPES.join(', ')}`)
    }

    const section = await this.sectionRepository.create({
      name,
      type: input.type as SectionType,
    })

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'section.created',
        targetId: section.id,
        targetType: 'section',
        metadata: { name: input.name, type: input.type },
      })
    } catch (auditError) {
      console.error('CreateSectionUseCase: failed to record section.created audit entry', {
        actorId: input.actorId,
        targetId: section.id,
        auditError,
      })
    }

    return section
  }
}
