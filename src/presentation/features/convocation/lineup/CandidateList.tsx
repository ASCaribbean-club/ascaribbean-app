import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'
import type { LineupCandidateView } from './useMatchLineupViewModel'

interface CandidateListProps {
  label: string
  candidates: LineupCandidateView[]
  onPick: (userId: string) => void
}

// specs/coach-match-composition.md UI design §4 (mockup C3) — the convoked
// players NOT on the field. Rows are whole-row buttons, `min-h-11`; a long
// list scrolls inside the panel (`max-h-64 overflow-y-auto`) instead of
// stretching the page. Empty pool = a sentence, never an empty list.
export function CandidateList({ label, candidates, onPick }: CandidateListProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-extrabold tracking-wider text-white/50 uppercase">{label}</p>
      {candidates.length === 0 ? (
        <p className="text-sm text-white/60">Aucun autre joueur convoqué n’est disponible.</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {candidates.map((candidate) => (
            <li key={candidate.userId}>
              <button
                type="button"
                onClick={() => onPick(candidate.userId)}
                className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-left transition-colors hover:bg-white/10"
              >
                <InitialsAvatar name={candidate.displayName} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{candidate.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
