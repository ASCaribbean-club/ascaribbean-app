// The club's own "crest" circle in the match hero (docs/designs/player-match-details/
// [v3] [Joueur] Mob - Détail Match-selection_1.png) — a plain two-tone
// circle (club colors, split diagonally), not a real logo image: `Team`
// (domain/entities/team.ts) carries no crest/logo field, so this is
// decorative shorthand for "our team" rather than data-driven. Mirrors the
// same conic-gradient trick already used for the role pill's dot in
// CoachHeader.tsx, just full-size and applied to the whole circle instead
// of a small leading dot.
export function TeamCrestAvatar() {
  return (
    <span
      aria-hidden
      className="size-11 shrink-0 rounded-full bg-[conic-gradient(var(--color-coach-green)_0deg_180deg,var(--color-coach-red)_180deg_360deg)]"
    />
  )
}
