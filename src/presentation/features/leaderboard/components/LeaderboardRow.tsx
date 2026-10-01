import type { LeaderboardMetric } from '@domain/entities/leaderboard'
import { Dot } from '@presentation/shared/components/Dot'
import { cn } from '@presentation/shared/lib/utils'
import { ownRowElementId, type LeaderboardRowModel } from '../useLeaderboardViewModel'
import { METRIC_ACCENT, METRIC_SHAPE } from './leaderboard-accent'

interface LeaderboardRowProps {
  row: LeaderboardRowModel
  metric: LeaderboardMetric
  // Player view only (UI design §5); false for a coach.
  emphasizeOwn: boolean
}

// Rank accent is decorative (gold / white / bronze): the number carries the
// information, tied players share number AND color.
function rankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-white'
  if (rank === 3) return 'text-orange-400'
  return 'text-white/60'
}

// UI design §3 — rank | name + secondary counters | main value. Not
// interactive (plain <li>). Each flex child carries min-w-0 or shrink-0 so a
// long name never pushes the value off a 320px screen.
export function LeaderboardRow({ row, metric, emphasizeOwn }: LeaderboardRowProps) {
  const accent = METRIC_ACCENT[metric]
  const emphasized = emphasizeOwn && row.isOwn
  // UI-LB-01 — emphasis wins over muting for the own row.
  const muted = row.isMuted && !emphasized

  return (
    <li
      id={ownRowElementId(row.userId)}
      aria-current={emphasized ? 'true' : undefined}
      className={cn(
        'flex min-h-16 items-center border-b border-white/10 py-2',
        emphasized ? cn('-mx-2.5 rounded-2xl border px-2.5', accent.border, accent.tint) : 'rounded-b-2xl',
        muted && 'text-white/50',
      )}
    >
      <span className={cn('w-8 shrink-0 text-[15px] font-black tabular-nums', muted ? 'text-white/50' : rankColor(row.rank))}>{row.rank}</span>
      <span className="flex w-4 shrink-0 justify-center">{emphasized && <Dot className={cn('size-2', accent.dot)} />}</span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={cn('flex min-w-0 items-center gap-1.5 text-[14.5px]', emphasized ? 'font-extrabold text-white' : 'font-semibold')}>
          {emphasized && <span className="sr-only">Vous : </span>}
          <span className="min-w-0 truncate">{row.displayName}</span>
        </p>
        <ul className="flex min-w-0 items-center gap-3 text-[12px] font-semibold">
          {row.counters.map((counter) => (
            <li key={counter.metric} className={cn('flex shrink-0 items-center gap-1.5', (muted || counter.count === 0) && 'opacity-40')}>
              <Dot className={cn(METRIC_SHAPE[counter.metric].counter, counter.metric !== 'goals' && METRIC_ACCENT[counter.metric].dot)} />
              <span aria-hidden>{counter.count}</span>
              <span className="sr-only">{counter.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <span className={cn('shrink-0 text-[20px] font-black tabular-nums', emphasized ? accent.text : muted ? 'text-white/50' : 'text-white/70')}>
        {row.value}
      </span>
    </li>
  )
}
