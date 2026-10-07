import type { AdminFinanceCarrier, CarrierKind } from '@domain/entities/finance'
import type { CreateFinanceCarrierInput, UpdateFinanceCarrierInput } from '@domain/repositories/finance-carrier-repository'
import type { FinanceCarrierInsertRow, FinanceCarrierRow, FinanceCarrierUpdateRow } from '../dto/finance-carrier-dto'

function toCarrierKind(value: string): CarrierKind {
  if (value === 'bank' || value === 'cash') return value
  throw new Error(`Unknown finance carrier kind: ${value}`)
}

export function toAdminFinanceCarrier(row: FinanceCarrierRow): AdminFinanceCarrier {
  return {
    id: row.id,
    label: row.label,
    kind: toCarrierKind(row.kind),
    detail: row.detail,
    managerUserId: row.manager_user_id,
    managerName: row.manager?.full_name ?? null,
    archivedAt: row.archived_at ?? null,
  }
}

export function toFinanceCarrierInsertRow(input: CreateFinanceCarrierInput): FinanceCarrierInsertRow {
  return { label: input.label, kind: input.kind, detail: input.detail, manager_user_id: input.managerUserId }
}

export function toFinanceCarrierUpdateRow(input: UpdateFinanceCarrierInput): FinanceCarrierUpdateRow {
  return { label: input.label, detail: input.detail, manager_user_id: input.managerUserId }
}
