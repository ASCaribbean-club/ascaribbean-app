import { IconChartBarOff } from '@tabler/icons-react'

// specs/player-stats.md UI design §4.1 — export 2's own copy, kept
// verbatim ("copie explicitement validée par la spec elle-même"). Distinct
// from the shared shared/components/EmptyState.tsx (icon + ONE message):
// this state needs a separate title + body (UI-PS-D — checked at build
// time, no existing shared component in presentation/shared/ carries that
// two-part shape; VoteEmptyState/EmptyState both take a single message
// string), so this stays a small local component rather than forcing a
// two-line message into a component built for one.
export function PlayerStatsEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center text-white">
      <IconChartBarOff className="size-9 text-white/40" aria-hidden />
      <p className="text-[15px] font-bold text-white">Rien à afficher pour le moment</p>
      <p className="max-w-xs text-[13px] text-white/50">
        Tes statistiques apparaîtront ici dès que les premiers entraînements et matchs de la saison seront validés par ton coach.
      </p>
    </div>
  )
}
