import type { LegacyEntry } from '@domain/entities/legacy'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidLegacyInputError } from '@domain/errors/invalid-legacy-input-error'
import { LegacySeasonNotConfiguredError } from '@domain/errors/legacy-season-not-configured-error'
import { can } from '@domain/policies/can'
import { isSeasonConfigured, validateManualAward } from '@domain/policies/legacy-rules'
import type { AuditLogRepository } from '@domain/repositories/audit-log-repository'
import type { LegacyRepository } from '@domain/repositories/legacy-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { UserRepository } from '@domain/repositories/user-repository'

export interface AwardLegacyPointsInput {
  actorId: string
  userId: string
  ruleId: string
  points: number
  reason: string
  earnedOn: string // date of the fact, yyyy-mm-dd
}

// docs/specs/asc-legacy.md PO-LG-08/PO-LG-19 — an officer or the admin awards
// points to a player ONLY by picking a manual rule of the référentiel; a reason
// is mandatory. Order: authorization, then the player, the rule, the points
// (validateManualAward), then PO-LG-16 (the season of the fact must be fully
// configured), then the write. RLS refuses the same cases on the SQL side
// (AC-LG-07), except PO-LG-16 which only this use case enforces.
//
// Audit (PO-LG-08, "legacy_points.awarded"): emitted here, after the entry has
// committed, never from a component nor a trigger. Same tradeoff as
// CreateSeasonUseCase: no shared transaction with the SECURITY DEFINER audit
// RPC, so a failing audit call is logged and never rejects the award.
// metadata: structured fields only — never the reason text, never a name.
export class AwardLegacyPointsUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly legacyRepository: LegacyRepository,
    private readonly seasonRepository: SeasonRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: AwardLegacyPointsInput): Promise<LegacyEntry> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    if (!can(actor, 'legacy:award')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to award Legacy points`)
    }

    const player = await this.userRepository.findById(input.userId)
    if (!player || !player.roles.some((assignment) => assignment.role === 'player')) {
      throw new InvalidLegacyInputError('Points can only be awarded to a player')
    }

    const rules = await this.legacyRepository.findRules()
    const rule = rules.find((r) => r.id === input.ruleId)
    if (!rule) {
      throw new InvalidLegacyInputError('Unknown rule')
    }
    validateManualAward({ rule, points: input.points, reason: input.reason, earnedOn: input.earnedOn })

    // PO-LG-16 — the season containing the date of the fact must have its mode
    // and its tiers; a date in no season counts as not configured.
    const seasons = await this.seasonRepository.findAll()
    const season = seasons.find((s) => s.startDate <= input.earnedOn && input.earnedOn <= s.endDate)
    if (!season) {
      throw new LegacySeasonNotConfiguredError('The date of the fact is in no season')
    }
    const [mode, tiers] = await Promise.all([
      this.legacyRepository.findSeasonMode(season.id),
      this.legacyRepository.findTiers(season.id),
    ])
    if (!isSeasonConfigured(mode, tiers)) {
      throw new LegacySeasonNotConfiguredError(`Season ${season.label} is not configured for Legacy`)
    }

    const entry = await this.legacyRepository.addManualEntry({
      userId: input.userId,
      ruleId: input.ruleId,
      points: input.points,
      reason: input.reason.trim(),
      earnedOn: input.earnedOn,
      createdBy: input.actorId,
    })

    try {
      await this.auditLogRepository.record({
        action: 'legacy_points.awarded',
        targetId: entry.id,
        targetType: 'legacy_points_entry',
        metadata: { userId: input.userId, ruleAction: rule.action, points: input.points, earnedOn: input.earnedOn },
      })
    } catch (auditError) {
      console.error('AwardLegacyPointsUseCase: failed to record legacy_points.awarded audit entry', {
        actorId: input.actorId,
        targetId: entry.id,
        auditError,
      })
    }

    return entry
  }
}
