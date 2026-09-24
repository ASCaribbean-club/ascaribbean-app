import type { MatchOutcome } from '@domain/policies/match-outcome-rules'
import { Badge } from '@presentation/shared/components/ui/badge'
import { Card } from '@presentation/shared/components/ui/card'
import { cn } from '@presentation/shared/lib/utils'

interface MatchOutcomeCardProps {
  outcome: MatchOutcome
  teamName: string
  opponentName: string
  goalsFor: number
  goalsAgainst: number
}

const OUTCOME_LABEL: Record<MatchOutcome, string> = {
  win: 'Victoire',
  draw: 'Nul',
  loss: 'Défaite',
}

const OUTCOME_CLASSNAME: Record<MatchOutcome, string> = {
  win: 'border-coach-green/35 bg-coach-green/15 text-coach-green-text',
  draw: 'border-white/15 bg-white/10 text-white/70',
  loss: 'border-coach-red/35 bg-coach-red/15 text-coach-red-text',
}

// specs/match-stats.md UI design §4/§5 — "carte issue" (player + coach
// read). AC-MS-02 — `outcome` is derived at read time by the ViewModel
// (getMatchOutcome), never stored; AC-MS-22 — always doubled by a text
// label, never color alone.
export function MatchOutcomeCard({ outcome, teamName, opponentName, goalsFor, goalsAgainst }: MatchOutcomeCardProps) {
  return (
    <Card className="items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
      <Badge className={cn('rounded-full px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide', OUTCOME_CLASSNAME[outcome])}>
        {OUTCOME_LABEL[outcome]}
      </Badge>

      <div className="flex w-full items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-left text-[13px] font-bold text-white/70">{teamName}</p>
        <p className="shrink-0 text-3xl font-extrabold text-white">
          {goalsFor} – {goalsAgainst}
        </p>
        <p className="min-w-0 flex-1 truncate text-right text-[13px] font-bold text-white/70">{opponentName}</p>
      </div>
    </Card>
  )
}
