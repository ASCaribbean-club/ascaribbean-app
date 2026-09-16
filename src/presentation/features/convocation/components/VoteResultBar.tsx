import { cn } from '@presentation/shared/lib/utils'

interface VoteResultBarProps {
  // 0-100 — already a percentage of the CATEGORY's own max, not of 100
  // votes: a candidate at the top of a 4-way split showing "43%" fills most
  // of the bar, same visual logic as ResponseBar's own present/absent/
  // pending segments (shared/components/ResponseBar.tsx), just one bar per
  // candidate here instead of one shared segmented bar.
  fillPercentage: number
  // Whether THIS bar renders in the accent colour (`coach-green`) or a
  // neutral one. Not tied to "highest value" — per the mockups, the coach
  // view colours every row (no personal-choice concept for a coach), while
  // the player view colours ONLY the row matching the player's own vote,
  // regardless of which candidate is actually leading (mockup 3: the
  // leading candidate at 43% stays grey when it isn't the player's own
  // pick). The caller (VoteCandidateRow) decides which rule applies for the
  // current role. AC-PV-20 — colour is never the only signal either way:
  // this bar is always paired with a rendered text value right next to it
  // (43%, or an absolute count).
  emphasize: boolean
}

// Purely presentational, single-purpose atomic piece so VoteCandidateRow
// doesn't have to inline this markup twice (once per unit — see that
// component). `coach-green` reused as the sole accent for the POSITIVE
// category only (AC-PV-16, this pass never renders the negative category) —
// see specs/player-vote.md UI design §"Couleur de catégorie" for why the
// negative category, if it ever comes back, is scoped to use `coach-amber`
// instead of `coach-red` on this same screen (collision with the Effectif
// tab's "Absent" badge one tab away).
export function VoteResultBar({ fillPercentage, emphasize }: VoteResultBarProps) {
  return (
    <div className="h-1.5 w-full min-w-[64px] overflow-hidden rounded-full bg-white/10" role="img" aria-hidden>
      <div
        className={cn('h-full rounded-full transition-[width]', emphasize ? 'bg-coach-green' : 'bg-white/35')}
        style={{ width: `${Math.max(0, Math.min(100, fillPercentage))}%` }}
      />
    </div>
  )
}
