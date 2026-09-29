import { Tabs, TabsList, TabsTrigger } from '@presentation/shared/components/ui/tabs'
import type { TeamStatsFilter } from '../useTeamStatsViewModel'

interface TeamStatsFilterSegmentProps {
  value: TeamStatsFilter
  onChange: (value: TeamStatsFilter) => void
}

// UI design §4.1/§5 — "TeamStatsFilterSegment", segmented control 3 états
// (Présence/Buts/Cartons), built on shadcn's Tabs primitive exactly like
// RangeModeToggle (features/calendar/components/RangeModeToggle.tsx) — same
// reasoning: free roving-tabindex/aria-selected keyboard behavior (AC-CTS-13/
// CDC §12), even though no TabsContent is ever rendered here either.
//
// AC-CTS-05 — this component carries NO data-filtering logic whatsoever,
// only the active-segment state: switching segments never changes which
// data was fetched (all three families are already loaded for an authorized
// coach), only which value TeamRosterStatRow puts in its headline slot.
export function TeamStatsFilterSegment({ value, onChange }: TeamStatsFilterSegmentProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as TeamStatsFilter)}>
      {/* h-11 on the track, min-w-0 on each of the three segments (CLAUDE.md
          §6 — three items side by side, same reasoning as RangeModeToggle's
          Sem/Mois pair and TypeSelector's chip row). */}
      <TabsList className="h-11 w-full gap-0.5 bg-white/8 p-1">
        <TabsTrigger value="presence" className="min-w-0 text-white/70 data-[state=active]:bg-white data-[state=active]:text-black">
          Présence
        </TabsTrigger>
        <TabsTrigger value="goals" className="min-w-0 text-white/70 data-[state=active]:bg-white data-[state=active]:text-black">
          Buts
        </TabsTrigger>
        <TabsTrigger value="cards" className="min-w-0 text-white/70 data-[state=active]:bg-white data-[state=active]:text-black">
          Cartons
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
