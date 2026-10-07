import type { OpeningBalance } from '../../entities/finance'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { isValidNonNegativeCents } from '../../rules/finance-form-rules'
import { recordFinanceAudit } from './record-finance-audit'

export interface UpdateOpeningBalanceUseCaseInput {
  actorId: string
  carrierId: string
  seasonId: string
  amountCents: number
}

// specs/mob-treasurer-finances-edit.md §2/AC-FIE-10 — 'opening_balance:update'
// (treasurer only; mirrors opening_balances_update_treasurer). An UPDATE of the
// existing (carrier, season) row — never a second insert; only `amount_cents`
// is writable. Same amount unchanged = no-op, no audit. Audit
// 'opening_balance.updated': carrier, season and amount before/after.
export class UpdateOpeningBalanceUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: UpdateOpeningBalanceUseCaseInput): Promise<OpeningBalance> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'opening_balance:update')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to update opening balances`)
    }

    if (!isValidNonNegativeCents(input.amountCents)) {
      throw new InvalidFinanceInputError('amountCents must be a non-negative integer number of cents')
    }
    if (!input.carrierId) throw new InvalidFinanceInputError('carrierId is required')
    if (!input.seasonId) throw new InvalidFinanceInputError('seasonId is required')

    const before = await this.financeRepository.findOpeningBalance(input.carrierId, input.seasonId)
    if (!before) throw new NotFoundError('Opening balance not found for this carrier and season')
    if (before.amountCents === input.amountCents) return before

    const after = await this.financeRepository.updateOpeningBalance(input.carrierId, input.seasonId, input.amountCents)

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'opening_balance.updated',
        targetId: after.id,
        targetType: 'opening_balance',
        metadata: {
          before: { carrierId: before.carrierId, seasonId: before.seasonId, amountCents: before.amountCents },
          after: { carrierId: after.carrierId, seasonId: after.seasonId, amountCents: after.amountCents },
        },
      },
      { useCase: 'UpdateOpeningBalanceUseCase', actorId: input.actorId },
    )

    return after
  }
}
