import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type {
  FinanceRepository,
  RecordedTreasuryCheckpoint,
  TreasuryCheckpointCountInput,
} from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { isValidNonNegativeCents, validateDebrief } from '../../rules/finance-form-rules'

export interface RecordTreasuryCheckpointUseCaseInput {
  actorId: string
  // yyyy-mm-dd in the CLUB timezone, supplied by the caller.
  checkedOn: string
  today: string
  counts: TreasuryCheckpointCountInput[]
  debrief: string
}

// specs/mob-treasurer-finances.md AC-FI-18/19/21 — 'treasury_checkpoint:record'
// (treasurer only). A point is a CONSTAT: it adjusts no balance. The
// theoretical amounts are NOT sent: the server computes and freezes them
// atomically with the lines (record_treasury_checkpoint()). One count per
// carrier, no duplicates. Audit 'treasury_checkpoint.recorded' emitted here;
// metadata: total variance only, NEVER the debrief. Audit failure only logged.
export class RecordTreasuryCheckpointUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: RecordTreasuryCheckpointUseCaseInput): Promise<RecordedTreasuryCheckpoint> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'treasury_checkpoint:record')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to record treasury checkpoints`)
    }

    if (input.counts.length === 0) throw new InvalidFinanceInputError('at least one carrier count is required')
    const carrierIds = new Set(input.counts.map((count) => count.carrierId))
    if (carrierIds.size !== input.counts.length || carrierIds.has('')) {
      throw new InvalidFinanceInputError('exactly one count per carrier is required')
    }
    if (!input.counts.every((count) => isValidNonNegativeCents(count.countedCents))) {
      throw new InvalidFinanceInputError('every counted amount must be a non-negative integer number of cents')
    }
    if (!input.checkedOn || input.checkedOn > input.today) {
      throw new InvalidFinanceInputError('checkedOn is required and cannot be in the future')
    }
    if (validateDebrief(input.debrief) !== null) {
      throw new InvalidFinanceInputError('debrief exceeds the maximum length')
    }

    const debrief = input.debrief.trim()
    const recorded = await this.financeRepository.createTreasuryCheckpoint({
      checkedOn: input.checkedOn,
      debrief: debrief === '' ? null : debrief,
      counts: input.counts,
    })

    try {
      await this.auditLogRepository.record({
        action: 'treasury_checkpoint.recorded',
        targetId: recorded.id,
        targetType: 'treasury_checkpoint',
        metadata: { totalVarianceCents: recorded.totalVarianceCents },
      })
    } catch (auditError) {
      console.error('RecordTreasuryCheckpointUseCase: failed to record treasury_checkpoint.recorded audit entry', {
        actorId: input.actorId,
        targetId: recorded.id,
        auditError,
      })
    }

    return recorded
  }
}
