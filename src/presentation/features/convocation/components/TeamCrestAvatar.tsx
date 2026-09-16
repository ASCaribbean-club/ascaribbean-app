// The club's own "crest" circle in the match hero (docs/designs/player-match-details/
// [v3] [Joueur] Mob - Détail Match-selection_1.png) — the app icon
// (public/icons/icon-512.png), not per-team data: `Team`
// (domain/entities/team.ts) carries no crest/logo field, and this is a
// single-club app, so the club logo stands in for "our team" everywhere.
export function TeamCrestAvatar() {
  return <img src="/icons/icon-512.png" alt="" aria-hidden className="size-11 shrink-0 rounded-full object-cover" />
}
