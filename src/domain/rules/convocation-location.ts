// specs/web-localizations.md §2.6/AC-WL-11 — the ONE rule giving the
// location to display for a convocation. Components never recompose it.
//
// Three valid forms (§2.2):
//   - training referencing a venue  -> the venue's current name
//   - match / meeting               -> the free-text `location`
//   - legacy training               -> the free-text `location`
import type { Convocation } from '../entities/convocation'

type ConvocationLocationFields = Pick<Convocation, 'location' | 'trainingLocation'>

export function getConvocationLocationLabel(convocation: ConvocationLocationFields): string {
  return convocation.trainingLocation?.name ?? convocation.location ?? ''
}

// The venue's current address, only when the convocation references one —
// null for match/meeting/legacy training, so a screen renders no second
// line at all (no empty slot, no placeholder dash).
export function getConvocationLocationAddress(convocation: ConvocationLocationFields): string | null {
  return convocation.trainingLocation?.address ?? null
}
