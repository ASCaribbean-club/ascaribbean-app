import { Button } from '@presentation/shared/components/ui/button'
import { Card } from '@presentation/shared/components/ui/card'
import { Input } from '@presentation/shared/components/ui/input'

interface MatchResultScoreCardProps {
  teamName: string
  opponentName: string
  goalsForInput: string
  goalsAgainstInput: string
  onChangeGoalsFor: (value: string) => void
  onChangeGoalsAgainst: (value: string) => void
  canUpdateScore: boolean
  isSubmitting: boolean
  onSubmit: () => void
}

// specs/match-stats.md UI design §3/§5 — "Carte SCORE". Zero business
// logic: every value/boolean here is already computed by
// useConvocationDetailViewModel's `matchResult` section (CLAUDE.md §4).
// AC-MS-23 — `min-w-0` on each
// grid item (a native numeric input's own intrinsic width would otherwise
// overlap its sibling on a narrow phone), `h-11` minimum on both `Input`s
// and the submit `Button` (shadcn's un-adjusted `h-8` is too small).
export function MatchResultScoreCard({
  teamName,
  opponentName,
  goalsForInput,
  goalsAgainstInput,
  onChangeGoalsFor,
  onChangeGoalsAgainst,
  canUpdateScore,
  isSubmitting,
  onSubmit,
}: MatchResultScoreCardProps) {
  return (
    <Card className="gap-4 rounded-2xl border border-white/10 bg-white/5 p-4.5">
      <p className="text-[11px] font-extrabold tracking-wider text-white/50 uppercase">Score</p>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 text-center">
          <p className="mb-2 truncate text-[12.5px] font-bold text-white/70">{teamName}</p>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            aria-label={`Buts ${teamName}`}
            value={goalsForInput}
            onChange={(event) => onChangeGoalsFor(event.target.value)}
            disabled={!canUpdateScore}
            className="h-11 min-w-0 rounded-xl border-white/15 bg-white/8 text-center text-lg font-extrabold text-white disabled:opacity-50"
          />
        </div>

        <span className="pt-6 text-[13px] font-bold text-white/50">–</span>

        <div className="min-w-0 flex-1 text-center">
          <p className="mb-2 truncate text-[12.5px] font-bold text-white/70">{opponentName}</p>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            aria-label={`Buts ${opponentName}`}
            value={goalsAgainstInput}
            onChange={(event) => onChangeGoalsAgainst(event.target.value)}
            disabled={!canUpdateScore}
            className="h-11 min-w-0 rounded-xl border-white/15 bg-white/8 text-center text-lg font-extrabold text-white disabled:opacity-50"
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={!canUpdateScore || isSubmitting}
        className="h-11 w-full rounded-xl bg-coach-green text-[14.5px] font-extrabold text-white hover:bg-coach-green/90 disabled:opacity-40"
      >
        Mettre à jour le score
      </Button>
    </Card>
  )
}
