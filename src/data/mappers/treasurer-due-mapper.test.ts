import { describe, expect, it } from 'vitest'
import type { TreasurerDueDto } from '../dto/treasurer-due-dto'
import { toTreasurerDue } from './treasurer-due-mapper'

describe('toTreasurerDue', () => {
  it('maps a null or unknown payment method to null', () => {
    const dto = (payment_method: string | null): TreasurerDueDto => ({
      membership_id: 'm', member_name: 'Joueur A', amount_due_cents: 100, sections: [],
      payments: [{ id: 'p', amount_cents: 100, paid_at: '2026-09-12', payment_method }],
      reminder_count: 0, last_reminded_at: null,
    })
    expect(toTreasurerDue(dto(null)).payments[0].paymentMethod).toBeNull()
    expect(toTreasurerDue(dto('cheque')).payments[0].paymentMethod).toBeNull()
  })

  it('maps every field, sections and payments included', () => {
    const dto: TreasurerDueDto = {
      membership_id: 'm-1',
      member_name: 'Joueur A',
      amount_due_cents: 15000,
      sections: [{ id: 's-1', name: 'Seniors' }],
      payments: [{ id: 'p-1', amount_cents: 5000, paid_at: '2026-09-12', payment_method: 'card' }],
      reminder_count: 2,
      last_reminded_at: '2026-10-01T08:30:00+00:00',
    }

    expect(toTreasurerDue(dto)).toEqual({
      membershipId: 'm-1',
      memberName: 'Joueur A',
      amountDueCents: 15000,
      sections: [{ id: 's-1', name: 'Seniors' }],
      payments: [{ id: 'p-1', amountCents: 5000, paidAt: '2026-09-12', paymentMethod: 'card' }],
      reminder: { count: 2, lastRemindedAt: '2026-10-01T08:30:00+00:00' },
    })
  })

  it('maps the reminder aggregate, keeping a null last date for a never-reminded membership', () => {
    const never = toTreasurerDue({ membership_id: 'm-4', member_name: 'Joueur D', amount_due_cents: 100, sections: [], payments: [], reminder_count: 0, last_reminded_at: null })
    expect(never.reminder).toEqual({ count: 0, lastRemindedAt: null })
  })

  it('keeps a null amount due and turns null arrays into empty ones', () => {
    const result = toTreasurerDue({ membership_id: 'm-2', member_name: 'Joueur B', amount_due_cents: null, sections: null, payments: null, reminder_count: null, last_reminded_at: null })
    expect(result).toEqual({ membershipId: 'm-2', memberName: 'Joueur B', amountDueCents: null, sections: [], payments: [], reminder: { count: 0, lastRemindedAt: null } })
  })

  it('never carries a dossier field through', () => {
    const result = toTreasurerDue({ membership_id: 'm-3', member_name: 'Joueur C', amount_due_cents: 0, sections: [], payments: [], reminder_count: 0, last_reminded_at: null })
    expect(result).not.toHaveProperty('licenceNumber')
    expect(result).not.toHaveProperty('status')
    expect(result).not.toHaveProperty('email')
  })
})
