import { describe, expect, it } from 'vitest'
import type { Payment } from '../entities/payment'
import { canSetMembershipActive, membershipPaymentStatus, sumPaymentsCents } from './membership-payment-rules'

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    membershipId: 'membership-1',
    amountCents: 15000,
    paidAt: '2026-09-01',
    recordedBy: 'admin-1',
    recordedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('sumPaymentsCents', () => {
  it('returns 0 for an empty history', () => {
    expect(sumPaymentsCents([])).toBe(0)
  })

  it('sums every payment, regardless of order', () => {
    const payments = [payment({ amountCents: 15000 }), payment({ id: 'payment-2', amountCents: 15000 })]
    expect(sumPaymentsCents(payments)).toBe(30000)
  })
})

describe('membershipPaymentStatus', () => {
  // §2.3 — the maquette's own "0€ / 300€", rouge, barre vide.
  it('returns "unpaid" when the sum is exactly 0', () => {
    expect(membershipPaymentStatus(0, 30000)).toBe('unpaid')
  })

  // §2.3 — the maquette's own "150€ / 300€", ambre.
  it('returns "partial" when the sum is strictly between 0 and the amount due', () => {
    expect(membershipPaymentStatus(15000, 30000)).toBe('partial')
  })

  // §2.3 — the maquette's own "300€ / 300€", vert. Exact-boundary case,
  // mirrors the isCurrentSeason-style "at exactly now" precedent.
  it('returns "paid" when the sum is exactly equal to the amount due', () => {
    expect(membershipPaymentStatus(30000, 30000)).toBe('paid')
  })

  // PO-WM-02 — over-perception stays "paid", never a new state.
  it('returns "paid" (not a new state) on over-perception, when the sum exceeds the amount due', () => {
    expect(membershipPaymentStatus(35000, 30000)).toBe('paid')
  })

  // §2.1 — a brand new membership from the "Nouvelle adhésion" dialog has
  // amountDueCents === null (the dialog doesn't carry that field): null must
  // deterministically resolve to the safe neutral state, never 'paid' and
  // never a thrown error/NaN comparison.
  it('returns "undefined" when amountDueCents is null', () => {
    expect(membershipPaymentStatus(0, null)).toBe('undefined')
    expect(membershipPaymentStatus(30000, null)).toBe('undefined')
  })

  // PO-WM-02 — a due amount of exactly 0 (or a corrupt negative) is treated
  // as "not configured", never as "trivially fully paid".
  it('returns "undefined" when amountDueCents is zero or negative', () => {
    expect(membershipPaymentStatus(0, 0)).toBe('undefined')
    expect(membershipPaymentStatus(100, -1)).toBe('undefined')
  })

  it('returns "unpaid" for a negative sum too (defensive — should never happen given the append-only positive-only invariant)', () => {
    expect(membershipPaymentStatus(-100, 30000)).toBe('unpaid')
  })
})

// specs/web-memberships.md §2.4/AC-WM-35 — règle d'activation (amendement du
// 2026-09-17). Rejection cases + acceptance cases, per the task's own
// enumeration: missing/blank licence, partial payment, zero payments, and
// the accepting case.
describe('canSetMembershipActive', () => {
  it('rejects when licenceNumber is null (missing licence)', () => {
    expect(canSetMembershipActive(null, 30000, 30000)).toBe(false)
  })

  it('rejects when licenceNumber is an empty string', () => {
    expect(canSetMembershipActive('', 30000, 30000)).toBe(false)
  })

  // §2.4 point 1 — "une chaîne d'espaces ne compte pas".
  it('rejects when licenceNumber is only whitespace', () => {
    expect(canSetMembershipActive('   ', 30000, 30000)).toBe(false)
  })

  it('rejects a partially paid cotisation, even with a valid licence', () => {
    expect(canSetMembershipActive('FR-12345', 15000, 30000)).toBe(false)
  })

  it('rejects zero payments recorded, even with a valid licence and a real amount due', () => {
    expect(canSetMembershipActive('FR-12345', 0, 30000)).toBe(false)
  })

  // §2.1/§2.4 cas limite — a membership with no amount due configured
  // (amountDueCents null, e.g. straight out of the create dialog) can never
  // read as "fully settled" (membershipPaymentStatus returns 'undefined',
  // not 'paid') — this is NOT an arbitration of PO-WM-02, see this
  // predicate's own doc comment.
  it('rejects when amountDueCents is null, even with a valid licence and payments recorded', () => {
    expect(canSetMembershipActive('FR-12345', 30000, null)).toBe(false)
  })

  it('accepts a valid licence with a cotisation exactly fully paid', () => {
    expect(canSetMembershipActive('FR-12345', 30000, 30000)).toBe(true)
  })

  // PO-WM-02 — over-perception still reads as "paid" (membershipPaymentStatus's
  // own rule), so it satisfies the activation rule too.
  it('accepts a valid licence with an over-perceived cotisation', () => {
    expect(canSetMembershipActive('FR-12345', 35000, 30000)).toBe(true)
  })

  // §2.4 — a due amount of exactly 0 (an "exonérée" membership) is treated
  // by membershipPaymentStatus as 'undefined', not trivially 'paid' — so it
  // does not satisfy the activation rule either (PO-WM-02, not resolved
  // here).
  it('rejects when amountDueCents is exactly 0, even with a valid licence', () => {
    expect(canSetMembershipActive('FR-12345', 0, 0)).toBe(false)
  })
})
