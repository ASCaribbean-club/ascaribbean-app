import { SECTION_TYPES, type Section, type SectionType } from '../../entities/section'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSectionInputError } from '../../errors/invalid-section-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { SectionRepository } from '../../repositories/section-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface UpdateSectionUseCaseInput {
  actorId: string
  sectionId: string
  name: string
  type: string
}

// specs/section-and-teams.md §2.6/§3 — WHO may write is 'section:write'
// (checked below, same as CreateSectionUseCase). Unlike
// UpdateSeasonUseCase, there is no "which rows are modifiable" state rule
// to deliberately leave to RLS here: no document requires a "section with
// teams" or any other state to be locked (PO-ST-04b), and no
// sections_update_admin clause restricts it beyond private.is_admin().
// specs/web-audit-logs.md — 2026-09-30 (fifth addendum, deliberate scope
// widening beyond "sensitive actions only") — this use case emits
// 'section.updated' below, after the update itself has already committed.
//
// Audit-write failure AFTER the update has already succeeded — same
// tradeoff, and same reasoning, as AssignRoleUseCase's own top comment: no
// shared transaction across the two calls (client-RLS-gated UPDATE on
// sections vs. a SECURITY DEFINER RPC on audit_log), so the section update
// cannot be rolled back if the audit call fails. Caught and surfaced via
// `console.error`, never rejecting this use case's own promise — the
// business outcome (the section is updated) already succeeded, the
// caller/UI should see success.
export class UpdateSectionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sectionRepository: SectionRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: UpdateSectionUseCaseInput): Promise<Section> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'section:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write sections`)
    }

    const name = input.name.trim()
    if (!name) {
      throw new InvalidSectionInputError('name is required')
    }
    if (!SECTION_TYPES.includes(input.type as SectionType)) {
      throw new InvalidSectionInputError(`type must be one of ${SECTION_TYPES.join(', ')}`)
    }

    // AC-ST-24 — updates the SAME row, never creates a duplicate.
    const section = await this.sectionRepository.update(input.sectionId, {
      name,
      type: input.type as SectionType,
    })

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'section.updated',
        targetId: input.sectionId,
        targetType: 'section',
        metadata: { name: input.name, type: input.type },
      })
    } catch (auditError) {
      console.error('UpdateSectionUseCase: failed to record section.updated audit entry', {
        actorId: input.actorId,
        targetId: input.sectionId,
        auditError,
      })
    }

    return section
  }
}
