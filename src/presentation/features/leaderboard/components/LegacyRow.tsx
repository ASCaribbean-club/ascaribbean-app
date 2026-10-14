import { MvpStar } from '@presentation/shared/components/MvpStar'
import { cn } from '@presentation/shared/lib/utils'
import { ownRowElementId, type LegacyRowModel } from '../useLeaderboardViewModel'

interface LegacyRowProps {
  row: LegacyRowModel
  // Player view only; false for a coach.
  emphasizeOwn: boolean
}

function rankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-white'
  if (rank === 3) return 'text-orange-400'
  return 'text-white/60'
}

// Same layout as PresenceRow: rank | name | points. Only the points are shown —
// never a source or a reason (the ranking exposes totals, not entries).
export function LegacyRow({ row, emphasizeOwn }: LegacyRowProps) {
  const emphasized = emphasizeOwn && row.isOwn
  const muted = row.isMuted && !emphasized

  return (
    <li
      id={ownRowElementId(row.userId)}
      aria-current={emphasized ? 'true' : undefined}
      className={cn(
        'flex min-h-14 items-center border-b border-white/10 py-2',
        emphasized ? '-mx-2.5 rounded-2xl border border-white/40 bg-white/10 px-2.5' : 'rounded-b-2xl',
        muted && 'text-white/50',
      )}
    >
      <span className={cn('w-8 shrink-0 text-[15px] font-black tabular-nums', muted ? 'text-white/50' : rankColor(row.rank))}>{row.rank}</span>

      <p className={cn('flex min-w-0 flex-1 items-center gap-1.5 text-[14.5px]', emphasized ? 'font-extrabold text-white' : 'font-semibold')}>
        {emphasized && <span className="sr-only">Vous : </span>}
        <span className="min-w-0 truncate">{row.displayName}</span>
        {row.isMvp && <MvpStar />}
      </p>

      <span className={cn('shrink-0 text-[20px] font-black tabular-nums', emphasized ? 'text-white' : muted ? 'text-white/50' : 'text-white/70')}>
        {row.pointsLabel}
      </span>
    </li>
  )
}
