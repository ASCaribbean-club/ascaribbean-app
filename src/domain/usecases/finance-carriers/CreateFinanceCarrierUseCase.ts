import type { AdminFinanceCarrier, CarrierKind } from '../../entities/finance'
import { DuplicateFinanceCarrierError } from '../../errors/duplicate-finance-carrier-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceCarrierInputError } from '../../errors/invalid-finance-carrier-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceCarrierRepository } from '../../repositories/finance-carrier-repository'
import type { UserRepository } from '../../repositories/user-repository'
import {
  isCarrierKind,
  normalizeCarrierDetail,
  normalizeCarrierLabel,
  validateCarrierDetail,
  validateCarrierLabel,
} from '../../rules/finance-carrier-rules'
import { recordFinanceAudit } from '../finances/record-finance-audit'

// specs/web-finance-carriers.md AC-FC-06/AC-FC-17 — 'finance_carrier:create'
// (admin only; mirrors finance_carriers_insert_admin). Pure validations run
// BEFORE any network call; the duplicate check (needs the list) comes right
// after, the database unique key on label_key being the final authority.
// Audit 'finance_carrier.created' (PO-FC-03 default): label, kind, manager
// account id (never the name), `hasDetail` boolean (never the detail text).
export class CreateFinanceCarrierUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeCarrierRepository: FinanceCarrierRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: {
    actorId: string
    label: string
    kind: CarrierKind | string
    detail?: string | null
    managerUserId?: string | null
  }): Promise<AdminFinanceCarrier> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'finance_carrier:create')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to create finance carriers`)
    }

    if (!isCarrierKind(input.kind)) throw new InvalidFinanceCarrierInputError(`Invalid carrier kind: ${String(input.kind)}`)
    const detailError = validateCarrierDetail(input.detail)
    if (detailError) throw new InvalidFinanceCarrierInputError(`Invalid carrier detail: ${detailError}`)
    const formatError = validateCarrierLabel(input.label, null, [])
    if (formatError) throw new InvalidFinanceCarrierInputError(`Invalid carrier label: ${formatError}`)

    const existing = await this.financeCarrierRepository.listForAdmin()
    if (validateCarrierLabel(input.label, null, existing) === 'duplicate') {
      throw new DuplicateFinanceCarrierError('A finance carrier with this label already exists')
    }

    const detail = normalizeCarrierDetail(input.detail)
    const managerUserId = input.managerUserId ?? null
    const created = await this.financeCarrierRepository.create({
      label: normalizeCarrierLabel(input.label),
      kind: input.kind,
      detail,
      managerUserId,
    })

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'finance_carrier.created',
        targetId: created.id,
        targetType: 'finance_carrier',
        metadata: { label: created.label, kind: created.kind, managerUserId, hasDetail: detail !== null },
      },
      { useCase: 'CreateFinanceCarrierUseCase', actorId: input.actorId },
    )

    return created
  }
}
