import type { LeaderboardMetric } from '@domain/entities/leaderboard'
import { Dot } from '@presentation/shared/components/Dot'
import { Tabs, TabsList, TabsTrigger } from '@presentation/shared/components/ui/tabs'
import { METRIC_ACCENT, METRIC_LABEL, METRIC_SHAPE } from './leaderboard-accent'

interface LeaderboardTabsProps {
  metric: LeaderboardMetric
  onMetricChange: (metric: LeaderboardMetric) => void
  // The list panel the tabs control (kept inside Tabs so aria-controls is valid).
  children: React.ReactNode
}

const METRICS: LeaderboardMetric[] = ['goals', 'yellow', 'red']

// UI design §4 — underlined tabs, overridden at the call site (tabs.tsx is
// vendored). One list panel re-rendered per tab, data already loaded.
export function LeaderboardTabs({ metric, onMetricChange, children }: LeaderboardTabsProps) {
  return (
    <Tabs value={metric} onValueChange={(value) => onMetricChange(value as LeaderboardMetric)} className="gap-4">
      <TabsList className="h-11 w-full min-w-0 justify-start gap-6 rounded-none border-b border-white/15 bg-transparent p-0">
        {METRICS.map((value) => (
          <TabsTrigger
            key={value}
            value={value}
            className={`h-11 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-[15px] font-bold text-white/60 shadow-none data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none ${METRIC_ACCENT[value].underline}`}
          >
            <Dot className={`${METRIC_SHAPE[value].tab} ${METRIC_ACCENT[value].dot}`} />
            {METRIC_LABEL[value]}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}
