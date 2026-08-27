interface TeamPillProps {
  teamName: string
}

// Visually identical to the shared `Pill` (presentation/shared/components/
// Pill.tsx — role pill, coach's "SM Groupe A ▾" team selector) but NOT a
// Pill: Pill always renders a <button>, which tells assistive tech (and a
// sighted user's thumb) that tapping does something. Here it never does —
// specs/player-dashboard.md UI design §"Structure de l'écran" point 1:
// "sans chevron cliquable actif ni sémantique de sélecteur... ne pas lui
// donner l'affordance tactile (pas de pressed state) d'un contrôle
// interactif". So this stays a plain, non-interactive <span>, not a Pill
// wrapped around a no-op onClick — the difference matters for a11y, not
// just visuals.
export function TeamPill({ teamName }: TeamPillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12.5px] font-bold text-white">
      {teamName}
    </span>
  )
}
