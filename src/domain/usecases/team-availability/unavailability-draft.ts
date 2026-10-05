import type { IsoDate, MedicalUnavailability, SuspensionUnavailability, Unavailability } from '@domain/entities/unavailability'
import { InvalidUnavailabilityInputError } from '@domain/errors/invalid-unavailability-input-error'

// The editable part of an Unavailability, per kind: what a coach/officer types.
// No free text on `medical` (GDPR art. 9) — same rule as the entity.
export type UnavailabilityDraft =
  | { kind: 'medical'; startsOn: IsoDate; expectedReturnOn: IsoDate | null }
  | { kind: 'suspension'; startsOn: IsoDate; matchCount: number; reason: string | null; liftedOn: IsoDate | null }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function assertIsoDate(value: string, field: string): void {
  if (!ISO_DATE.test(value)) throw new InvalidUnavailabilityInputError(`${field} must be YYYY-MM-DD`)
  // Rejects 2026-02-31: round-trips through Date at UTC (calendar check only,
  // the string itself is what gets stored).
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new InvalidUnavailabilityInputError(`${field} is not a real calendar date`)
  }
}

// Checks shape only. `end > start` is NOT checked: that range rule is OPEN
// (PO-PU-08) — do not resolve it here.
export function normalizeDraft(draft: UnavailabilityDraft): UnavailabilityDraft {
  assertIsoDate(draft.startsOn, 'startsOn')

  if (draft.kind === 'medical') {
    if (draft.expectedReturnOn !== null) assertIsoDate(draft.expectedReturnOn, 'expectedReturnOn')
    return draft
  }

  if (!Number.isInteger(draft.matchCount) || draft.matchCount < 0) {
    throw new InvalidUnavailabilityInputError('matchCount must be a non-negative integer')
  }
  if (draft.liftedOn !== null) assertIsoDate(draft.liftedOn, 'liftedOn')
  const reason = draft.reason?.trim() ?? ''
  return { ...draft, reason: reason === '' ? null : reason }
}

// Applies a draft on top of an existing record, keeping identity and
// provenance (id, userId, declaredBy, declaredAt).
export function applyDraft(existing: Unavailability, draft: UnavailabilityDraft): Unavailability {
  if (draft.kind !== existing.kind) {
    throw new InvalidUnavailabilityInputError('the kind of an existing unavailability cannot change')
  }
  const normalized = normalizeDraft(draft)
  const base = {
    id: existing.id,
    userId: existing.userId,
    declaredBy: existing.declaredBy,
    declaredAt: existing.declaredAt,
    startsOn: normalized.startsOn,
  }
  if (normalized.kind === 'medical') {
    const next: MedicalUnavailability = { ...base, kind: 'medical', expectedReturnOn: normalized.expectedReturnOn }
    return next
  }
  const next: SuspensionUnavailability = {
    ...base,
    kind: 'suspension',
    matchCount: normalized.matchCount,
    reason: normalized.reason,
    liftedOn: normalized.liftedOn,
  }
  return next
}
