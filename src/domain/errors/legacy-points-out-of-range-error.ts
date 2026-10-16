import { InvalidLegacyInputError } from '@domain/errors/invalid-legacy-input-error'

// A variable manual rule received points outside min..max (or not an integer).
// Subclass of InvalidLegacyInputError so existing catches keep working; the UI
// maps it to its own message (docs/specs/legacy-points-catchup.md OPEN-LPC-06).
export class LegacyPointsOutOfRangeError extends InvalidLegacyInputError {
  constructor(
    readonly action: string,
    readonly min: number,
    readonly max: number,
  ) {
    super(`Points must be an integer between ${min} and ${max}`)
  }
}
