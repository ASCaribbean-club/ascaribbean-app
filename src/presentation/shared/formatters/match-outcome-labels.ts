import type { MatchOutcome } from '@domain/policies/match-outcome-rules'

// AC-MS-22 — outcome is never color-only, always doubled by the French word.
// Extracted from MatchOutcomeCard (its original owner) once a second call
// site (CalendarConvocationRow's past-match result badge) needed the exact
// same mapping — reused, not duplicated.
export const MATCH_OUTCOME_LABEL: Record<MatchOutcome, string> = {
  win: 'Victoire',
  draw: 'Nul',
  loss: 'Défaite',
}

export const MATCH_OUTCOME_BADGE_CLASSNAME: Record<MatchOutcome, string> = {
  win: 'border-coach-green/35 bg-coach-green/15 text-coach-green-text',
  draw: 'border-white/15 bg-white/10 text-white/70',
  loss: 'border-coach-red/35 bg-coach-red/15 text-coach-red-text',
}
