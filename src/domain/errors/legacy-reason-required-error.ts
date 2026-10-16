import { InvalidLegacyInputError } from '@domain/errors/invalid-legacy-input-error'

// PO-LG-19 — a manual award needs a non-blank reason. Own type so the UI shows
// "Le motif est obligatoire." instead of the tiers-specific message.
export class LegacyReasonRequiredError extends InvalidLegacyInputError {}
