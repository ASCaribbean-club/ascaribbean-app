import { IconTrophy } from '@tabler/icons-react'
import { cn } from '@presentation/shared/lib/utils'

interface OfficialMatchBadgeProps {
  // 'icon' = the trophy alone (dense rows, accessible label in sr-only);
  // 'pill' = trophy + visible "Officiel" (detail header).
  variant?: 'icon' | 'pill'
  className?: string
}

// specs/convocation-player-selection.md AC-CPS-09 — an official match is
// flagged by a trophy, ALWAYS doubled by the accessible label "Match officiel":
// the state is carried by the shape and the text, never by colour alone. A
// friendly match renders nothing at all (callers only mount this when
// competitionType === 'official').
export function OfficialMatchBadge({ variant = 'icon', className }: OfficialMatchBadgeProps) {
  if (variant === 'pill') {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full bg-coach-amber/15 px-2.5 py-1 text-[11.5px] font-bold text-coach-amber', className)}>
        <IconTrophy aria-hidden className="size-3.5" />
        <span aria-hidden>Officiel</span>
        <span className="sr-only">Match officiel</span>
      </span>
    )
  }
  return (
    <span className={cn('inline-flex shrink-0 text-coach-amber', className)}>
      <IconTrophy aria-hidden className="size-4" />
      <span className="sr-only">Match officiel</span>
    </span>
  )
}
