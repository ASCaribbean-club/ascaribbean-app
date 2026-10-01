import { IconChevronDown } from '@tabler/icons-react'
import type { LeaderboardMetric } from '@domain/entities/leaderboard'
import { Button } from '@presentation/shared/components/ui/button'
import { cn } from '@presentation/shared/lib/utils'
import { METRIC_ACCENT } from './leaderboard-accent'

interface YouBarProps {
  metric: LeaderboardMetric
  rank: number
  displayName: string
  value: number
  onClick: () => void
}

// UI design §5 — player view only. `sticky bottom-0` with an opaque
// bg-coach-bg wrapper so rows never show through; the button scrolls the
// list to the player's own row.
export function YouBar({ metric, rank, displayName, value, onClick }: YouBarProps) {
  const accent = METRIC_ACCENT[metric]

  return (
    <div className="sticky bottom-0 z-10 bg-coach-bg px-5.5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Button
        type="button"
        onClick={onClick}
        aria-label={`Aller à ma ligne, rang ${rank}, ${value}`}
        variant="ghost"
        className={cn('h-12 w-full min-w-0 justify-between gap-3 rounded-2xl border px-4 text-white hover:text-white', accent.border, accent.tint)}
      >
        <span className="shrink-0 text-[11px] font-extrabold tracking-wider text-white/70">VOUS</span>
        <span className="min-w-0 flex-1 truncate text-left text-[14.5px] font-bold">
          #{rank} · {displayName}
        </span>
        <span className={cn('flex shrink-0 items-center gap-1 text-[20px] font-black tabular-nums', accent.text)}>
          {value}
          <IconChevronDown className="size-4" aria-hidden />
        </span>
      </Button>
    </div>
  )
}
