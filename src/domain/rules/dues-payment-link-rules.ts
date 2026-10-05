// Rules around the member-facing cotisation payment link
// (specs/profile-membership-dues.md). "What is true" predicates and input
// normalisation, never "who may" (no entry in policies/rbac-matrix.ts).
import { InvalidPaymentUrlError, PaymentUrlTooLongError } from '../errors/invalid-season-input-error'
import type { MembershipPaymentStatus } from './membership-payment-rules'

// AC-PMD-11 — the link is rendered if and only if the cotisation is still
// owing ('unpaid' or 'partial') AND the season carries a payment URL. 'paid'
// (including over-payment) and 'undefined' (no amount due) never show it.
export function shouldShowDuesPaymentLink(status: MembershipPaymentStatus, paymentUrl: string | null): boolean {
  return (status === 'unpaid' || status === 'partial') && paymentUrl !== null
}

// SQL mirror: seasons.payment_url CHECK in
// supabase/migrations/20261005180000_seasons_payment_url.sql
// (`^https://[^[:space:]]+$`, case-insensitive, char_length <= 2048) —
// change both together (CLAUDE.md §7).
export const PAYMENT_URL_MAX_LENGTH = 2048

// AC-PMD-17 — blank or empty input becomes null ("no link"); anything else
// must be a valid https: URL without whitespace and at most 2 048 characters,
// else InvalidPaymentUrlError (PaymentUrlTooLongError for the length case), both InvalidSeasonInputError subclasses.
// Returns the trimmed value as typed, not `URL.href`: the link is rendered
// exactly as the admin entered it (AC-PMD-13).
export function normalizePaymentUrl(raw: string | null): string | null {
  if (raw === null) return null
  const value = raw.trim()
  if (value === '') return null

  if (value.length > PAYMENT_URL_MAX_LENGTH) {
    throw new PaymentUrlTooLongError(`paymentUrl must be at most ${PAYMENT_URL_MAX_LENGTH} characters`)
  }
  if (/\s/.test(value) || !/^https:\/\//i.test(value)) {
    throw new InvalidPaymentUrlError('paymentUrl must be a valid https URL')
  }
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') throw new Error('not https')
  } catch {
    throw new InvalidPaymentUrlError('paymentUrl must be a valid https URL')
  }
  return value
}
