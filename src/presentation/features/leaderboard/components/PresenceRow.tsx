import { cn } from '@presentation/shared/lib/utils'
import { ownRowElementId, type PresenceRowModel } from '../useLeaderboardViewModel'

interface PresenceRowProps {
  row: PresenceRowModel
  // Player view only; false for a coach.
  emphasizeOwn: boolean
}

function rankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-white'
  if (rank === 3) return 'text-orange-400'
  return 'text-white/60'
}

// Same layout as LeaderboardRow: rank | name + rates | confirmed presences.
// The response rate is a thin bar doubled by its text label.
export function PresenceRow({ row, emphasizeOwn }: PresenceRowProps) {
  const emphasized = emphasizeOwn && row.isOwn
  const muted = row.isMuted && !emphasized

  return (
    <li
      id={ownRowElementId(row.userId)}
      aria-current={emphasized ? 'true' : undefined}
      className={cn(
        'flex min-h-16 items-center border-b border-white/10 py-2',
        emphasized ? '-mx-2.5 rounded-2xl border border-white/40 bg-white/10 px-2.5' : 'rounded-b-2xl',
        muted && 'text-white/50',
      )}
    >
      <span className={cn('w-8 shrink-0 text-[15px] font-black tabular-nums', muted ? 'text-white/50' : rankColor(row.rank))}>{row.rank}</span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn('flex min-w-0 items-center gap-1.5 text-[14.5px]', emphasized ? 'font-extrabold text-white' : 'font-semibold')}>
          {emphasized && <span className="sr-only">Vous : </span>}
          <span className="min-w-0 truncate">{row.displayName}</span>
        </p>
        <p className="text-[12px] font-semibold text-white/60">{row.attendanceLabel}</p>
        <div className="flex min-w-0 items-center gap-2 text-[12px] font-semibold">
          <div aria-hidden className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-coach-green" style={{ width: `${row.responseRate ?? 0}%` }} />
          </div>
          <span className="min-w-0 truncate text-white/60">{row.responseLabel}</span>
        </div>
      </div>

      <span className={cn('shrink-0 text-[20px] font-black tabular-nums', emphasized ? 'text-white' : muted ? 'text-white/50' : 'text-white/70')}>
        {row.presentCount}
        <span className="sr-only"> présences</span>
      </span>
    </li>
  )
}
