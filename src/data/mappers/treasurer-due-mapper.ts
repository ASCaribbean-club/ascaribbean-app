import { isPaymentMethod } from '@domain/entities/payment-method'
import type { TreasurerDue } from '@domain/entities/treasurer-due'
import type { TreasurerDueDto } from '../dto/treasurer-due-dto'

export function toTreasurerDue(dto: TreasurerDueDto): TreasurerDue {
  return {
    membershipId: dto.membership_id,
    memberName: dto.member_name,
    amountDueCents: dto.amount_due_cents,
    sections: (dto.sections ?? []).map((section) => ({ id: section.id, name: section.name })),
    payments: (dto.payments ?? []).map((payment) => ({
      id: payment.id,
      amountCents: payment.amount_cents,
      paidAt: payment.paid_at,
      paymentMethod: isPaymentMethod(payment.payment_method) ? payment.payment_method : null,
    })),
    reminder: { count: dto.reminder_count ?? 0, lastRemindedAt: dto.last_reminded_at },
  }
}
