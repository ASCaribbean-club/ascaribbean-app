import { cn } from '@presentation/shared/lib/utils'

// Badge colour by tier rank (Bronze=1 … Platine=6, spec §3.4). Cosmetic only:
// the tier's identity is its rank number and name, never the colour alone.
const RANK_STYLES: Record<number, string> = {
  1: 'bg-amber-700 text-white',
  2: 'bg-slate-300 text-slate-900',
  3: 'bg-yellow-400 text-yellow-950',
  4: 'bg-emerald-500 text-emerald-950',
  5: 'bg-rose-600 text-white',
  6: 'bg-sky-200 text-sky-950',
}

interface LegacyTierBadgeProps {
  rank: number | null
  className?: string
}

export function LegacyTierBadge({ rank, className }: LegacyTierBadgeProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-extrabold',
        rank !== null ? RANK_STYLES[rank] ?? 'bg-white/20 text-white' : 'bg-white/10 text-white/60',
        className,
      )}
    >
      {rank ?? '–'}
    </span>
  )
}
