import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'

interface MatchGoalsListProps {
  goals: { id: string; displayName: string; isPenalty: boolean }[]
}

// specs/match-stats.md UI design §3/§4/§5 — "BUTEURS" read list (player +
// coach, `match_goals:view`). No minute anywhere (§7's own correction
// proposal — no domain field backs it, UI-MS-D stays open) — only the
// scorer's name and, when relevant, a "Penalty" tag, matching AC-MS-16.
export function MatchGoalsList({ goals }: MatchGoalsListProps) {
  if (goals.length === 0) {
    return <p className="text-[12.5px] text-white/40">Aucun but enregistré pour l’instant.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {goals.map((goal) => (
        <li key={goal.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <InitialsAvatar name={goal.displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-white">{goal.displayName}</p>
            {goal.isPenalty && <p className="text-[12px] text-white/50">Penalty</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}
