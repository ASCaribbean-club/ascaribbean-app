import { FinanceCarrierArchiveRefusedError } from '../../errors/finance-carrier-archive-refused-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceCarrierInputError } from '../../errors/invalid-finance-carrier-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceCarrierRepository } from '../../repositories/finance-carrier-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { recordFinanceAudit } from '../finances/record-finance-audit'

// specs/finances-member-advances.md D-B2/AC-FA-22/AC-FA-23 — restoring a
// carrier uses the SAME action as archiving ('finance_carrier:archive',
// PO-FA-06 default; mirrors restore_finance_carrier()). Restoring an active
// carrier is refused and writes nothing. Audit 'finance_carrier.restored':
// label and kind only.
export class RestoreFinanceCarrierUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeCarrierRepository: FinanceCarrierRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: { actorId: string; carrierId: string }): Promise<void> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'finance_carrier:archive')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to restore finance carriers`)
    }
    if (!input.carrierId) throw new InvalidFinanceCarrierInputError('carrierId is required')

    const carriers = await this.financeCarrierRepository.listForAdmin()
    const before = carriers.find((carrier) => carrier.id === input.carrierId)
    if (!before) throw new NotFoundError(`Finance carrier not found: ${input.carrierId}`)
    if (before.archivedAt === null) {
      throw new FinanceCarrierArchiveRefusedError('not-archived', `Finance carrier is not archived: ${input.carrierId}`)
    }

    await this.financeCarrierRepository.restore(input.carrierId)

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'finance_carrier.restored',
        targetId: before.id,
        targetType: 'finance_carrier',
        metadata: { label: before.label, kind: before.kind },
      },
      { useCase: 'RestoreFinanceCarrierUseCase', actorId: input.actorId },
    )
  }
}
