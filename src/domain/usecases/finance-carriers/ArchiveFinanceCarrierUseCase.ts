import { FinanceCarrierArchiveRefusedError } from '../../errors/finance-carrier-archive-refused-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceCarrierInputError } from '../../errors/invalid-finance-carrier-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceCarrierRepository } from '../../repositories/finance-carrier-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { recordFinanceAudit } from '../finances/record-finance-audit'

// specs/finances-member-advances.md D-B1..B4/AC-FA-16/AC-FA-23 —
// 'finance_carrier:archive' (admin only; mirrors archive_finance_carrier()).
// The use case never computes nor receives the balance: the three refusals
// (no current season, opening balance not entered, non-zero current balance)
// are decided by the database, in its transaction, and surface as
// FinanceCarrierArchiveRefusedError — in which case NOTHING is written and NO
// audit entry is emitted. Audit 'finance_carrier.archived': label and kind
// only, never the detail nor the manager's name.
export class ArchiveFinanceCarrierUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeCarrierRepository: FinanceCarrierRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: { actorId: string; carrierId: string }): Promise<void> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'finance_carrier:archive')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to archive finance carriers`)
    }
    if (!input.carrierId) throw new InvalidFinanceCarrierInputError('carrierId is required')

    const carriers = await this.financeCarrierRepository.listForAdmin()
    const before = carriers.find((carrier) => carrier.id === input.carrierId)
    if (!before) throw new NotFoundError(`Finance carrier not found: ${input.carrierId}`)
    if (before.archivedAt !== null) {
      throw new FinanceCarrierArchiveRefusedError('already-archived', `Finance carrier already archived: ${input.carrierId}`)
    }

    await this.financeCarrierRepository.archive(input.carrierId)

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'finance_carrier.archived',
        targetId: before.id,
        targetType: 'finance_carrier',
        metadata: { label: before.label, kind: before.kind },
      },
      { useCase: 'ArchiveFinanceCarrierUseCase', actorId: input.actorId },
    )
  }
}
