import type { AdminFinanceCarrier, CarrierKind } from '../entities/finance'

// specs/web-finance-carriers.md §2.2/AC-FC-07 — the backoffice management of
// carriers. DELIBERATELY no delete method: a carrier is referenced by
// expenses, opening balances, payments and checkpoint lines. Since
// specs/finances-member-advances.md (PO-FC-02 lifted) a carrier can be archived
// and restored, never deleted. The audit trail is emitted by the use cases,
// never here.

// 'finance_carrier:create' — label_key is computed server-side, never sent.
export interface CreateFinanceCarrierInput {
  label: string
  kind: CarrierKind
  detail: string | null
  managerUserId: string | null
}

// 'finance_carrier:update' — NO `kind`: it is not modifiable (PO-FC-01).
export interface UpdateFinanceCarrierInput {
  label: string
  detail: string | null
  managerUserId: string | null
}

export interface FinanceCarrierRepository {
  // Every carrier, archived ones included and listed AFTER the active ones, each
  // group ordered by kind then label (UI-FA-09).
  listForAdmin(): Promise<AdminFinanceCarrier[]>
  create(input: CreateFinanceCarrierInput): Promise<AdminFinanceCarrier>
  update(id: string, input: UpdateFinanceCarrierInput): Promise<AdminFinanceCarrier>
  // 'finance_carrier:archive' — archive_finance_carrier(): the SERVER computes
  // the current balance and refuses (FinanceCarrierArchiveRefusedError) with
  // the cause; the client never provides a balance.
  archive(id: string): Promise<void>
  // 'finance_carrier:archive' — restore_finance_carrier().
  restore(id: string): Promise<void>
}
