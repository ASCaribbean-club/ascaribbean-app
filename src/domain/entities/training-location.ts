// specs/web-localizations.md §2.5 — a reusable training venue, managed by
// the administrator in the backoffice. Never deleted (PO-WL-03): a venue
// that is no longer offered is archived, but stays readable so the
// convocations that reference it can still resolve its name and address.
export interface TrainingLocation {
  id: string
  name: string
  address: string
  isArchived: boolean
}
