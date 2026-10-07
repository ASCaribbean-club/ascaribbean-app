import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { recordFinanceAudit } from './record-finance-audit'

// specs/mob-treasurer-finances-edit.md §2/AC-FIE-13/14 —
// 'treasury_checkpoint:delete' (treasurer only; mirrors
// delete_treasury_checkpoint(), atomic: the point and all its lines). Audit
// 'treasury_checkpoint.deleted': date, lines (counted and frozen theoretical)
// and total variance — never the debrief. PO-FIE-09 applies (a failed audit
// write leaves no trace; inherited, not resolved).
export class DeleteTreasuryCheckpointUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: { actorId: string; checkpointId: string }): Promise<void> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'treasury_checkpoint:delete')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to delete treasury checkpoints`)
    }
    if (!input.checkpointId) throw new InvalidFinanceInputError('checkpointId is required')

    const before = await this.financeRepository.getTreasuryCheckpointDetail(input.checkpointId)
    if (!before) throw new NotFoundError(`Treasury checkpoint not found: ${input.checkpointId}`)

    await this.financeRepository.deleteTreasuryCheckpoint(input.checkpointId)

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'treasury_checkpoint.deleted',
        targetId: before.id,
        targetType: 'treasury_checkpoint',
        metadata: {
          before: {
            checkedOn: before.checkedOn,
            lines: before.lines.map((line) => ({
              carrierId: line.carrierId,
              countedCents: line.countedCents,
              theoreticalCents: line.theoreticalCents,
            })),
            totalVarianceCents: before.lines.reduce((total, line) => total + (line.countedCents - line.theoreticalCents), 0),
          },
        },
      },
      { useCase: 'DeleteTreasuryCheckpointUseCase', actorId: input.actorId },
    )
  }
}
