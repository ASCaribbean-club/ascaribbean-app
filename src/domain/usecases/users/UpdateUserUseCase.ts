import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFullNameInputError } from '../../errors/invalid-full-name-input-error'
import { InvalidUserProfileInputError } from '../../errors/invalid-user-profile-input-error'
import { can } from '../../policies/can'
import { isValidUserAge } from '../../policies/user-profile-rules'
import type { Handedness } from '../../entities/user'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface UpdateUserUseCaseInput {
  actorId: string
  userId: string
  fullName: string
  age: number | null
  handedness: Handedness | null
}

// specs/web-users.md §2.7/§3 (PO-WU-02 résolu) — "Modifier l'utilisateur".
// Writes full_name, age and handedness ONLY (admin-only via 'user:write'),
// never email — the dialog renders the EMAIL field
// too, but this use case's own input has no email field to leak: the same
// "the type documents the guarantee instead of merely a runtime check"
// reasoning already used for AssignCoachToTeamsUseCase's hard-coded
// role/sectionId. Club-wide action, no team/section scope (§3, 'admin'
// carries no scope field) — no context object needed here.
//
// §4 "Journal d'audit" — CDC §11.3 names "changement de rôle" but NOT a
// generic profile edit; a rename wasn't one of the two actions the
// original web-users.md pass flagged as newly-pressing (PO-WU-07/PO-WU-08).
//
// specs/web-audit-logs.md — 2026-09-30 (fifth addendum, deliberate scope
// widening beyond "sensitive actions only") — this use case now emits
// 'user.updated' below regardless, after the rename itself has already
// committed: the developer confirmed this broader create/edit coverage for
// structural admin data (membership/season/section/team/user), not just
// CDC §11.3-named sensitive actions. `metadata` stays empty (`{}`) rather
// than carrying the new `fullName` — the target's own row already says
// the new value, and a name isn't excessive to log but there's no reason
// to duplicate it here either; kept minimal on purpose.
//
// Audit-write failure AFTER the rename has already succeeded — same
// tradeoff, and same reasoning, as AssignRoleUseCase's own top comment: no
// shared transaction across the two calls (client-RLS-gated UPDATE on
// users vs. a SECURITY DEFINER RPC on audit_log), so the rename cannot be
// rolled back if the audit call fails. Caught and surfaced via
// `console.error`, never rejecting this use case's own promise — the
// business outcome (the name is updated) already succeeded, the caller/UI
// should see success.
export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: UpdateUserUseCaseInput): Promise<void> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(actor, 'user:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write users`)
    }

    // AC-WU-38 — rejected from the domain, before any network call. The
    // users_update_admin RLS policy repeats this at the database level via
    // `not null`/`check` on the column itself (defence in depth).
    const fullName = input.fullName.trim()
    if (!fullName) {
      throw new InvalidFullNameInputError('fullName is required')
    }
    if (!input.userId) {
      throw new InvalidFullNameInputError('userId is required')
    }

    if (!isValidUserAge(input.age)) {
      throw new InvalidUserProfileInputError('age must be an integer between 1 and 120')
    }

    await this.userRepository.updateProfile(input.userId, { fullName, age: input.age, handedness: input.handedness })

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'user.updated',
        targetId: input.userId,
        targetType: 'user',
        metadata: {},
      })
    } catch (auditError) {
      console.error('UpdateUserUseCase: failed to record user.updated audit entry', {
        actorId: input.actorId,
        targetId: input.userId,
        auditError,
      })
    }
  }
}
