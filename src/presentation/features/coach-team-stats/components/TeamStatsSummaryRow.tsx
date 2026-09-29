import type { CardTally } from '@domain/policies/team-stats-rules'
import { Card, CardContent, CardHeader, CardTitle } from '@presentation/shared/components/ui/card'

interface TeamStatsSummaryRowProps {
  goals: number | undefined
  cards: CardTally | undefined
}

// UI design §3/§5 — direct reuse of the coach-dashboard's FormAndGoalsRow
// compact card shape (Card, small-caps label, big number) rather than a new
// visual pattern. Staff-only by construction (§1/§3 of the spec) — this
// component is only ever mounted for the Coach/Staff variant of the screen
// (the only variant this pass builds, §2), never conditionally hidden inside
// a shared tree.
//
// Static regardless of the active Présence/Buts/Cartons filter (§3, "il est
// statique") — this component takes no `filter` prop at all, by design.
// Team-wide "Buts" total sits alongside the two card totals in the same row
// (developer decision, 2026-09-29) rather than its own separate card — all
// three are the SAME kind of thing: a static per-type aggregate shown before
// the per-player roster breakdown below it.
export function TeamStatsSummaryRow({ goals, cards }: TeamStatsSummaryRowProps) {
  const goalsCount = goals ?? 0
  const yellowCount = cards?.yellowCount ?? 0
  const redCount = cards?.redCount ?? 0

  return (
    <div className="grid grid-cols-3 gap-2.5">
      <Card className="gap-2.25 rounded-[18px] border-white/10 bg-white/6 p-3.5 text-center">
        <CardHeader className="min-h-8 content-center justify-items-center p-0">
          <CardTitle className="text-[10.5px] font-extrabold tracking-wider text-white/55 uppercase">Buts marqués</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-[21px] font-black text-white">{goalsCount}</p>
        </CardContent>
      </Card>

      <Card className="gap-2.25 rounded-[18px] border-white/10 bg-white/6 p-3.5 text-center">
        <CardHeader className="min-h-8 content-center justify-items-center p-0">
          <CardTitle className="text-[10.5px] font-extrabold tracking-wider text-white/55 uppercase">Cartons jaunes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-[21px] font-black text-coach-amber">{yellowCount}</p>
        </CardContent>
      </Card>

      <Card className="gap-2.25 rounded-[18px] border-white/10 bg-white/6 p-3.5 text-center">
        <CardHeader className="min-h-8 content-center justify-items-center p-0">
          <CardTitle className="text-[10.5px] font-extrabold tracking-wider text-white/55 uppercase">Cartons rouges</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-[21px] font-black text-coach-red-text">{redCount}</p>
        </CardContent>
      </Card>
    </div>
  )
}
