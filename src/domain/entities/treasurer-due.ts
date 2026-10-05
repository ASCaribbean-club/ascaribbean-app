// specs/mobile-treasurer.md §2/§3 — the financial slice of one membership as
// the Treasurer sees it: name, section(s), amount due and payments. Never a
// licence number, membership status, validity or e-mail (the Treasurer is
// "financier seulement" on member files).
export interface TreasurerDueSection {
  id: string
  name: string
}

import type { DuesReminderState } from './dues-reminder'
import type { PaymentMethod } from './payment-method'

export interface TreasurerDuePayment {
  id: string
  amountCents: number
  paidAt: string // ISO date (yyyy-mm-dd) — date the payment was RECEIVED
  paymentMethod: PaymentMethod | null
}

export interface TreasurerDue {
  membershipId: string
  memberName: string
  // The membership's OWN stored amount; the season-tariff fallback
  // (PO-TR-03) is applied by GetTreasurerDuesUseCase, not here.
  amountDueCents: number | null
  // Sections of the teams where the member is a player in the membership's
  // season (PO-TR-02): none, one, or several.
  sections: TreasurerDueSection[]
  payments: TreasurerDuePayment[]
  // specs/mobile-treasurer.md amendement (4): reminder count and last date.
  reminder: DuesReminderState
}
