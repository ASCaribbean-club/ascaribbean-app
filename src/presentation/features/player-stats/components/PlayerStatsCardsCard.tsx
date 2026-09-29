import { Card, CardContent, CardHeader, CardTitle } from '@presentation/shared/components/ui/card'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'

export type PlayerStatsCardsCardStatus = 'loading' | 'available' | 'error'

interface PlayerStatsCardsCardProps {
  status: PlayerStatsCardsCardStatus
  // A real 0 is a normal value (same reasoning as PlayerStatsGoalsCard §4.3)
  // — only `null` while `status !== 'available'`.
  yellowCount: number | null
  redCount: number | null
  errorMessage: string
}

// specs/player-stats.md addendum "PO-PS-03 tranché" — own yellow/red cards,
// same compact card grammar as PlayerStatsGoalsCard. Two counters side by
// side rather than a combined "cartons" total: a yellow and a red card carry
// different disciplinary weight, collapsing them into one number would lose
// that distinction (AC-PS-23 — never a single figure standing in for two
// different meanings).
export function PlayerStatsCardsCard({ status, yellowCount, redCount, errorMessage }: PlayerStatsCardsCardProps) {
  return (
    <Card className="gap-2.5 rounded-[18px] border-white/10 bg-white/6 p-4.5">
      <CardHeader className="p-0">
        <CardTitle className="text-[10.5px] font-extrabold tracking-wider text-white/55 uppercase">Cartons</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {status === 'loading' && <Skeleton className="h-8 w-32" />}
        {status === 'error' && <p className="text-[13px] font-semibold text-white/50">{errorMessage}</p>}
        {status === 'available' && yellowCount !== null && redCount !== null && (
          <div className="flex items-baseline gap-4">
            <p className="text-[26px] font-extrabold text-white">
              {yellowCount} <span className="text-[13px] font-bold text-white/50">jaunes</span>
            </p>
            <p className="text-[26px] font-extrabold text-white">
              {redCount} <span className="text-[13px] font-bold text-white/50">rouges</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
