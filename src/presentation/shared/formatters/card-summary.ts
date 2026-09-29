import type { CardTally } from '@domain/policies/team-stats-rules'

// specs/coach-team-stats.md UI design §4.1 — "résumé cartons texte ('1
// jaune', '3 jaunes · 1 rouge', 'Aucun carton')". Pure display formatting
// (CLAUDE.md §5), never a business rule — the TALLYING itself stays in
// domain/policies/team-stats-rules.ts, this only turns an already-computed
// {yellowCount, redCount} into the exact wording the mockup shows.
export function formatCardSummary({ yellowCount, redCount }: CardTally): string {
  if (yellowCount === 0 && redCount === 0) return 'Aucun carton'

  const parts: string[] = []
  if (yellowCount > 0) parts.push(`${yellowCount} jaune${yellowCount > 1 ? 's' : ''}`)
  if (redCount > 0) parts.push(`${redCount} rouge${redCount > 1 ? 's' : ''}`)
  return parts.join(' · ')
}
