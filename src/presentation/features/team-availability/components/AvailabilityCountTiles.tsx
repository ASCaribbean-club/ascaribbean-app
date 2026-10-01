import { cn } from '@presentation/shared/lib/utils'
import type { AvailabilityCounts } from '../availability-view'

interface AvailabilityCountTilesProps {
  counts: AvailabilityCounts
  outLabel: string
}

// Informational only, not interactive (the chips filter). A zero count is
// dimmed, never hidden.
export function AvailabilityCountTiles({ counts, outLabel }: AvailabilityCountTilesProps) {
  const tiles = [
    { label: 'Disponibles', count: counts.available, className: 'border-coach-green/40 bg-coach-green/10 text-coach-green-text' },
    { label: outLabel, count: counts.out, className: 'border-coach-amber/40 bg-coach-amber/10 text-coach-amber' },
    { label: 'Suspendus', count: counts.suspended, className: 'border-coach-red/40 bg-coach-red/10 text-coach-red-text' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={cn('flex min-w-0 flex-col rounded-2xl border px-3 py-2.5', tile.className, tile.count === 0 && 'opacity-50')}
        >
          <span className="text-2xl font-extrabold text-white">{tile.count}</span>
          <span className="truncate text-[12.5px] font-bold">{tile.label}</span>
        </div>
      ))}
    </div>
  )
}
