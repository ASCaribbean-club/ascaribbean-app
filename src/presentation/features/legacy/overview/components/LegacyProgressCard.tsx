import { Progress } from '@presentation/shared/components/ui/progress'
import { cn } from '@presentation/shared/lib/utils'

interface LegacyProgressCardProps {
  title: string
  current: number
  target: number
  percent: number
  hint: string
  isBlockedBySeasons: boolean
}

// Mockup states 1-3 — progress to the next tier. When the points are met but
// the seasons are not, the bar turns amber and says so (points alone never
// unlock a tier). The hint is text, so the bar never carries information alone.
export function LegacyProgressCard({ title, current, target, percent, hint, isBlockedBySeasons }: LegacyProgressCardProps) {
  return (
    <section className="flex flex-col gap-2.5 rounded-3xl border border-white/10 bg-white/5 p-4.5">
      <div className="flex items-baseline justify-between text-sm font-bold text-white">
        <h2>{title}</h2>
        <span>
          {current.toLocaleString('fr-FR')} / {target.toLocaleString('fr-FR')} pts
        </span>
      </div>
      <Progress
        value={percent}
        className="h-2 bg-white/10"
        aria-label={title}
      />
      <p className={cn('text-[12.5px]', isBlockedBySeasons ? 'font-semibold text-amber-400' : 'text-white/60')}>{hint}</p>
    </section>
  )
}
