import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type {
  FinanceRepository,
  RecordedTreasuryCheckpoint,
  TreasuryCheckpointCountInput,
} from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { hasCheckpointChanged, isValidNonNegativeCents, validateDebrief } from '../../rules/finance-form-rules'
import { recordFinanceAudit } from './record-finance-audit'

export interface UpdateTreasuryCheckpointUseCaseInput {
  actorId: string
  checkpointId: string
  counts: TreasuryCheckpointCountInput[]
  debrief: string
}

// specs/mob-treasurer-finances-edit.md §2/AC-FIE-11/12/14 —
// 'treasury_checkpoint:update' (treasurer only; mirrors
// update_treasury_checkpoint()). PO-FIE-02 default: ONLY the counted amounts
// and the debrief are corrected; the date, the season, the author and the
// FROZEN theoretical amounts are never sent nor recomputed. One count per
// carrier already counted in the point. Nothing changed = no write, no audit.
// Audit 'treasury_checkpoint.updated': counted amounts and total variance
// before/after, plus `debriefChanged` — NEVER the debrief text (PO-FIE-03).
export class UpdateTreasuryCheckpointUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: UpdateTreasuryCheckpointUseCaseInput): Promise<RecordedTreasuryCheckpoint> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'treasury_checkpoint:update')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to update treasury checkpoints`)
    }

    if (!input.checkpointId) throw new InvalidFinanceInputError('checkpointId is required')
    if (input.counts.length === 0) throw new InvalidFinanceInputError('at least one carrier count is required')
    const carrierIds = new Set(input.counts.map((count) => count.carrierId))
    if (carrierIds.size !== input.counts.length || carrierIds.has('')) {
      throw new InvalidFinanceInputError('exactly one count per carrier is required')
    }
    if (!input.counts.every((count) => isValidNonNegativeCents(count.countedCents))) {
      throw new InvalidFinanceInputError('every counted amount must be a non-negative integer number of cents')
    }
    if (validateDebrief(input.debrief) !== null) {
      throw new InvalidFinanceInputError('debrief exceeds the maximum length')
    }

    const before = await this.financeRepository.getTreasuryCheckpointDetail(input.checkpointId)
    if (!before) throw new NotFoundError(`Treasury checkpoint not found: ${input.checkpointId}`)

    // Only the carriers counted by this point can be corrected (O-FIE-UI-05).
    const countedCarrierIds = new Set(before.lines.map((line) => line.carrierId))
    if (carrierIds.size !== countedCarrierIds.size || [...carrierIds].some((id) => !countedCarrierIds.has(id))) {
      throw new InvalidFinanceInputError('counts must cover exactly the carriers counted by this checkpoint')
    }

    const theoreticalByCarrier = new Map(before.lines.map((line) => [line.carrierId, line.theoreticalCents]))
    const totalVariance = (counts: TreasuryCheckpointCountInput[]) =>
      counts.reduce((total, count) => total + (count.countedCents - (theoreticalByCarrier.get(count.carrierId) ?? 0)), 0)
    const beforeCounts = before.lines.map((line) => ({ carrierId: line.carrierId, countedCents: line.countedCents }))

    const debrief = input.debrief.trim()
    const debriefChanged = before.debrief.trim() !== debrief
    if (
      !hasCheckpointChanged(
        { counts: beforeCounts, debrief: before.debrief },
        { counts: input.counts, debrief },
      )
    ) {
      return { id: before.id, totalVarianceCents: totalVariance(beforeCounts) }
    }

    const recorded = await this.financeRepository.updateTreasuryCheckpoint(input.checkpointId, {
      debrief: debrief === '' ? null : debrief,
      counts: input.counts,
    })

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'treasury_checkpoint.updated',
        targetId: before.id,
        targetType: 'treasury_checkpoint',
        metadata: {
          before: { counts: beforeCounts, totalVarianceCents: totalVariance(beforeCounts) },
          after: { counts: input.counts, totalVarianceCents: recorded.totalVarianceCents },
          debriefChanged,
        },
      },
      { useCase: 'UpdateTreasuryCheckpointUseCase', actorId: input.actorId },
    )

    return recorded
  }
}
