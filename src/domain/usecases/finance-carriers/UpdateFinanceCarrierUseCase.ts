import type { AdminFinanceCarrier } from '../../entities/finance'
import { DuplicateFinanceCarrierError } from '../../errors/duplicate-finance-carrier-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceCarrierInputError } from '../../errors/invalid-finance-carrier-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceCarrierRepository } from '../../repositories/finance-carrier-repository'
import type { UserRepository } from '../../repositories/user-repository'
import {
  hasCarrierChanged,
  normalizeCarrierDetail,
  normalizeCarrierLabel,
  validateCarrierDetail,
  validateCarrierLabel,
} from '../../rules/finance-carrier-rules'
import { recordFinanceAudit } from '../finances/record-finance-audit'

// specs/web-finance-carriers.md AC-FC-06/AC-FC-17 — 'finance_carrier:update'
// (admin only; mirrors finance_carriers_update_admin + the column grant).
// Accepts NO `kind` (PO-FC-01). Reads the state BEFORE for the audit. A
// no-change update writes nothing and emits no audit entry. Audit
// 'finance_carrier.updated' (PO-FC-03 default): label and manager id
// before/after, `detailChanged` boolean instead of the detail text, `kind`
// recalled (unchanged).
export class UpdateFinanceCarrierUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeCarrierRepository: FinanceCarrierRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: {
    actorId: string
    carrierId: string
    label: string
    detail?: string | null
    managerUserId?: string | null
  }): Promise<AdminFinanceCarrier> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'finance_carrier:update')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to update finance carriers`)
    }

    const detailError = validateCarrierDetail(input.detail)
    if (detailError) throw new InvalidFinanceCarrierInputError(`Invalid carrier detail: ${detailError}`)
    const formatError = validateCarrierLabel(input.label, input.carrierId, [])
    if (formatError) throw new InvalidFinanceCarrierInputError(`Invalid carrier label: ${formatError}`)

    const existing = await this.financeCarrierRepository.listForAdmin()
    const before = existing.find((carrier) => carrier.id === input.carrierId)
    if (!before) throw new NotFoundError(`Finance carrier not found: ${input.carrierId}`)
    if (validateCarrierLabel(input.label, input.carrierId, existing) === 'duplicate') {
      throw new DuplicateFinanceCarrierError('A finance carrier with this label already exists')
    }

    const next = {
      label: normalizeCarrierLabel(input.label),
      detail: normalizeCarrierDetail(input.detail),
      managerUserId: input.managerUserId ?? null,
    }
    if (!hasCarrierChanged(before, next)) return before

    const after = await this.financeCarrierRepository.update(input.carrierId, next)

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'finance_carrier.updated',
        targetId: after.id,
        targetType: 'finance_carrier',
        metadata: {
          before: { label: before.label, managerUserId: before.managerUserId },
          after: { label: after.label, managerUserId: after.managerUserId },
          detailChanged: normalizeCarrierDetail(before.detail) !== next.detail,
          kind: after.kind,
        },
      },
      { useCase: 'UpdateFinanceCarrierUseCase', actorId: input.actorId },
    )

    return after
  }
}
