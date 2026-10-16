import { InvalidLegacyInputError } from '@domain/errors/invalid-legacy-input-error'

// docs/specs/legacy-points-catchup.md PO-LPC-03 / AC-LPC-05 — the date of the
// fact is not inside the season chosen by the actor. Carries the season's range
// (ISO dates) so the message can name it.
export class LegacyDateOutsideSeasonError extends InvalidLegacyInputError {
  constructor(
    readonly startDate: string,
    readonly endDate: string,
  ) {
    super(`The date of the fact is outside the chosen season (${startDate} - ${endDate})`)
  }
}
