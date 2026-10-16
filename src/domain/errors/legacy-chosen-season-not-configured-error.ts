import { LegacySeasonNotConfiguredError } from '@domain/errors/legacy-season-not-configured-error'

// docs/specs/legacy-points-catchup.md AC-LPC-06 — the season CHOSEN for a
// catch-up lacks its points mode or its tiers. Subclass so the UI can word the
// refusal around the chosen season instead of "the season of this date".
export class LegacyChosenSeasonNotConfiguredError extends LegacySeasonNotConfiguredError {}
