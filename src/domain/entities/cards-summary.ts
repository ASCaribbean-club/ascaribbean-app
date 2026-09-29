// specs/player-stats.md addendum "PO-PS-03 tranché" — backs
// get_my_cards_count(). Two counters, own yellow/red cards only, season-
// scoped. Never `penalty_missed` — not asked for, stays staff-only.
export interface CardsSummary {
  yellowCount: number
  redCount: number
}
