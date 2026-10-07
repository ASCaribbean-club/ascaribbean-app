import type { OpeningBalance } from '../../entities/finance'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { isValidNonNegativeCents } from '../../rules/finance-form-rules'

export interface RecordOpeningBalanceUseCaseInput {
  actorId: string
  carrierId: string
  seasonId: string
  amountCents: number
}

// specs/mob-treasurer-finances.md AC-FI-28..30 — 'opening_balance:record'
// (treasurer only), ONE entry per (carrier, season): a second attempt is
// refused by opening_balances_carrier_season_unique (DuplicateOpeningBalanceError
// via the error mapper). Audit 'opening_balance.recorded' emitted here;
// metadata: carrier and amount. Audit failure only logged (same tradeoff as
// RecordPaymentUseCase).
export class RecordOpeningBalanceUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: RecordOpeningBalanceUseCaseInput): Promise<OpeningBalance> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'opening_balance:record')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to record opening balances`)
    }

    if (!isValidNonNegativeCents(input.amountCents)) {
      throw new InvalidFinanceInputError('amountCents must be a non-negative integer number of cents')
    }
    if (!input.carrierId) throw new InvalidFinanceInputError('carrierId is required')
    if (!input.seasonId) throw new InvalidFinanceInputError('seasonId is required')

    const openingBalance = await this.financeRepository.createOpeningBalance({
      carrierId: input.carrierId,
      seasonId: input.seasonId,
      amountCents: input.amountCents,
      recordedBy: user.id,
    })

    try {
      await this.auditLogRepository.record({
        action: 'opening_balance.recorded',
        targetId: openingBalance.id,
        targetType: 'opening_balance',
        metadata: { carrierId: openingBalance.carrierId, amountCents: openingBalance.amountCents },
      })
    } catch (auditError) {
      console.error('RecordOpeningBalanceUseCase: failed to record opening_balance.recorded audit entry', {
        actorId: input.actorId,
        targetId: openingBalance.id,
        auditError,
      })
    }

    return openingBalance
  }
}
