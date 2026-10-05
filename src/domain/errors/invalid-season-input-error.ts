import { DomainError } from './domain-error'

// specs/web-seasons.md §2.4/AC-WS-10 — thrown by CreateSeasonUseCase /
// UpdateSeasonUseCase, from the domain and before any network call, when
// label/startDate/endDate is missing OR when startDate is after endDate.
// The last case has no Postgres CHECK constraint behind it — left
// unvalidated it would fail daterange construction with an error code
// map-supabase-error.ts doesn't recognize, falling through its `default`
// branch to a mismapped NotFoundError (§2.4). Same minimal pattern as
// InvalidNewsInputError, the class carries no logic of its own.
export class InvalidSeasonInputError extends DomainError {}

// specs/profile-membership-dues.md §2.2/AC-PMD-17 — a payment URL that is not
// a valid https: address. Subclass (still an InvalidSeasonInputError) so
// mapDomainErrorToUiError can show the payment-link copy instead of the
// generic season one.
export class InvalidPaymentUrlError extends InvalidSeasonInputError {}

// specs/profile-membership-dues.md §2.2/AC-PMD-17 — a payment URL longer than
// the 2 048 characters the seasons.payment_url CHECK allows. A subclass (still
// an InvalidSeasonInputError for every existing catch/instanceof) only so
// mapDomainErrorToUiError can show the "trop long" copy instead of the
// generic "adresse https invalide" one.
export class PaymentUrlTooLongError extends InvalidSeasonInputError {}
