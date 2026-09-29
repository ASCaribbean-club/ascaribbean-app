import { Card, CardContent, CardHeader, CardTitle } from '@presentation/shared/components/ui/card'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'

export type PlayerStatsGoalsCardStatus = 'loading' | 'available' | 'error'

interface PlayerStatsGoalsCardProps {
  status: PlayerStatsGoalsCardStatus
  // A real 0 is a normal value here (§4.3 — "zéro but est un état normal"),
  // never treated as an empty/unavailable state on its own. Only `null`
  // while `status !== 'available'`.
  count: number | null
  errorMessage: string
}

// specs/player-stats.md UI design §5 — "PlayerStatsGoalsCard", same compact
// single-number grammar as FormAndGoalsRow's "BUTS" card on the coach
// dashboard (docs/designs/v4_coach_dashboard.png, reused pattern, not
// reinvented). AC-PS-03 — this number is season-scoped, own goals only,
// never derived from a match score.
export function PlayerStatsGoalsCard({ status, count, errorMessage }: PlayerStatsGoalsCardProps) {
  return (
    <Card className="gap-2.5 rounded-[18px] border-white/10 bg-white/6 p-4.5">
      <CardHeader className="p-0">
        <CardTitle className="text-[10.5px] font-extrabold tracking-wider text-white/55 uppercase">Buts marqués</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {status === 'loading' && <Skeleton className="h-8 w-16" />}
        {status === 'error' && <p className="text-[13px] font-semibold text-white/50">{errorMessage}</p>}
        {status === 'available' && count !== null && (
          <p className="text-[26px] font-extrabold text-white">
            {count} <span className="text-[13px] font-bold text-white/50">cette saison</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
