// Rules derived from a membership's payment history — "qu'est-ce qui est
// vrai" (is this membership paid, partial, unpaid), never "qui a le droit"
// (that stays in domain/policies/). specs/web-memberships.md §2.3/AC-WM-12.
//
// Deliberately NOT keyed to one single entity file the way membership-rules.ts
// is keyed to Membership alone: this predicate combines a Membership's
// payment history (a Payment[], a DIFFERENT entity/table) with an amount
// due that, as of this pass, lives nowhere in the schema at all (see
// amountDueCents's own doc comment below) — ARCHITECTURE.md §3 places
// "règles dérivées d'une entity" in domain/rules/, and this is the closest
// fit for a rule that is still pure, still takes no dependency on React/
// Supabase, and still answers a "what is true" question rather than a "who
// may" one.
import type { Payment } from '../entities/payment'

export function sumPaymentsCents(payments: Payment[]): number {
  return payments.reduce((total, payment) => total + payment.amountCents, 0)
}

// specs/web-memberships.md §2.3 — the three states the mockup illustrates,
// plus a fourth this spec's own UI design section proposes as a SAFE
// DEFAULT for the amount-due-unknown case (PO-WM-02, non-blocking) — see
// membershipPaymentStatus's own comment on amountDueCents for why that
// fourth state exists and is not itself an arbitration of PO-WM-01/PO-WM-02.
export type MembershipPaymentStatus = 'unpaid' | 'partial' | 'paid' | 'undefined'

// AC-WM-12/AC-WM-13 — the ONE place this is computed. The COTISATION column,
// the "cotisation" filter AND the activation rule (AC-WM-35, see
// canSetMembershipActive below) all call this function with the exact same
// two numbers, never a separate calculation.
//
// amountDueCents: amendement du 2026-09-17, PO-WM-01 RESOLVED — `memberships`
// now carries a real `amount_due_cents` column (§2.1/AC-WM-34). This
// function still accepts `number | null`, because the column itself is
// nullable: the "Nouvelle adhésion" dialog never sets it (§2.1), so a brand
// new membership legitimately has no amount due yet. Passing `null`
// deterministically returns 'undefined' — the "montant dû non paramétré"
// rendering the UI design section specifies (a neutral state, never a
// division-by-zero, never a false "payé"); PO-WM-02 (should this instead
// read as "payé d'office"?) remains open and unresolved by this function.
//
// Boundary cases (§2.3, mirrors the isNewsVisible-style "at exactly now"
// precedent CLAUDE.md §8 asks for):
//   - paidCents === 0                     → 'unpaid' (never 'partial')
//   - 0 < paidCents < amountDueCents      → 'partial'
//   - paidCents === amountDueCents        → 'paid' (the exact-boundary case)
//   - paidCents > amountDueCents          → 'paid' (over-perception, PO-WM-02
//                                            — the CALLER is responsible for
//                                            capping any progress-bar WIDTH
//                                            at 100%; this function never
//                                            lies about the underlying sum)
//   - amountDueCents === null             → 'undefined'
//   - amountDueCents <= 0                 → 'undefined' (a "free" membership
//                                            is not modelled as "paid
//                                            instantly" — PO-WM-02 leaves
//                                            exoneration undecided, this is
//                                            the safe default, not a verdict)
export function membershipPaymentStatus(paidCents: number, amountDueCents: number | null): MembershipPaymentStatus {
  if (amountDueCents === null || amountDueCents <= 0) return 'undefined'
  if (paidCents <= 0) return 'unpaid'
  if (paidCents < amountDueCents) return 'partial'
  return 'paid'
}

// specs/web-memberships.md §2.4/AC-WM-35 — règle d'activation, posée par la
// développeuse le 2026-09-17, dérivable d'aucune maquette. A membership may
// only be WRITTEN (create or update, never read) with status 'active' if
// BOTH:
//   1. licenceNumber is set and non-blank (a string of only spaces doesn't
//      count, §2.4 point 1) ;
//   2. the cotisation is fully settled, in the exact sense of
//      membershipPaymentStatus above being 'paid' (sum of payments >=
//      amountDueCents) — reuses that SAME predicate (AC-WM-13), never a
//      second inline comparison.
//
// Deliberately does NOT special-case amountDueCents === null (the "brand
// new membership from the create dialog" case, §2.1): membershipPaymentStatus
// already returns 'undefined' for that input, which is not 'paid', so this
// predicate naturally (not by an added branch) rejects activating a
// membership with no amount due configured yet — the safe default the UI
// design section already committed to for that column, reused here rather
// than re-litigated. This is NOT an arbitration of PO-WM-02 ("peut-on
// passer active sans montant dû ?", still open) — it is what falls out of
// composing the two rules the spec DOES fix (AC-WM-12/13's predicate,
// AC-WM-35's two conditions) without inventing a third branch.
//
// This predicate constrains WRITING 'active' only (§2.4, "piège à éviter"):
// it must never be used to decide whether an EXISTING 'active' row should
// be read/rendered as active — that stays isActive()/isExpired() in
// membership-rules.ts, untouched (AC-WM-18), and no automatic downgrade of
// an already-active row is introduced anywhere by this function (§2.4).
export function canSetMembershipActive(licenceNumber: string | null, paidCents: number, amountDueCents: number | null): boolean {
  const hasLicence = licenceNumber !== null && licenceNumber.trim() !== ''
  const isFullySettled = membershipPaymentStatus(paidCents, amountDueCents) === 'paid'
  return hasLicence && isFullySettled
}
