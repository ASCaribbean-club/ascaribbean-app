import { isPaymentMethod } from '@domain/entities/payment-method'
import type { Payment } from '@domain/entities/payment'
import type { CreatePaymentInput } from '@domain/repositories/payment-repository'
import type { PaymentInsertRow, PaymentRow } from '@data/dto/payment-dto'

export function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    membershipId: row.membership_id,
    amountCents: row.amount_cents,
    paidAt: row.paid_at,
    // An unknown stored value (should be impossible under the CHECK) reads as none.
    paymentMethod: isPaymentMethod(row.payment_method) ? row.payment_method : null,
    carrierId: row.carrier_id ?? null,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at,
  }
}

// specs/web-memberships.md §2.2 — the reverse direction, input -> row,
// needed by PaymentRepositoryImpl.create() (CLAUDE.md §4). No `recordedAt`:
// the database default (now()) is authoritative for when the entry was
// actually made, never a client-supplied clock value.
export function toPaymentInsertRow(input: CreatePaymentInput): PaymentInsertRow {
  return {
    membership_id: input.membershipId,
    amount_cents: input.amountCents,
    paid_at: input.paidAt,
    payment_method: input.paymentMethod,
    carrier_id: input.carrierId ?? null,
    recorded_by: input.recordedBy,
  }
}
