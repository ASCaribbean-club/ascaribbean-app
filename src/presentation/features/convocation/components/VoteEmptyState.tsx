import { IconChartBarOff } from '@tabler/icons-react'

interface VoteEmptyStateProps {
  message: string
}

// AC-PV-13 — "une convocation sans aucun vote rend un état vide explicite
// par catégorie, jamais une erreur, jamais une liste de zéros présentée
// comme un classement". This is a deliberately DIFFERENT component from a
// list of VoteCandidateRow(mode="result") entries all sitting at 0/0% — a
// bar chart full of empty bars still reads as a ranking (someone's still
// "first"), which is exactly what this criterion forbids. Rendered for both
// roles identically (player and coach, UI design "États à couvrir" table).
export function VoteEmptyState({ message }: VoteEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center">
      <IconChartBarOff className="size-6 text-white/40" aria-hidden />
      <p className="text-[12.5px] text-white/50">{message}</p>
    </div>
  )
}
