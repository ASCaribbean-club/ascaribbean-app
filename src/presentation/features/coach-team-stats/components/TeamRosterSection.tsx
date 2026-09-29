import type { TeamAttendanceSummary } from '@domain/usecases/coach-team-stats/GetTeamStatsUseCase'
import type { CardTally } from '@domain/policies/team-stats-rules'
import type { TeamStatsFilter } from '../useTeamStatsViewModel'
import { TeamRosterStatRow } from './TeamRosterStatRow'
import { TeamStatsFilterSegment } from './TeamStatsFilterSegment'

export interface TeamRosterStatEntry {
  userId: string
  displayName: string
  attendance: TeamAttendanceSummary | null
  goalsCount: number
  cards: CardTally
}

interface TeamRosterSectionProps {
  roster: TeamRosterStatEntry[]
  filter: TeamStatsFilter
  onFilterChange: (filter: TeamStatsFilter) => void
}

// UI design §3 — "Section Effectif": title + TeamStatsFilterSegment + the
// roster list, including its own dedicated empty state (AC-CTS-16, "effectif
// vide" — distinct from "aucune séance constatée"/"aucun match joué"/"aucun
// carton", none of which are this one).
export function TeamRosterSection({ roster, filter, onFilterChange }: TeamRosterSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11.5px] font-extrabold tracking-wide text-white/50 uppercase">Effectif</h2>

      <TeamStatsFilterSegment value={filter} onChange={onFilterChange} />

      {roster.length === 0 ? (
        <p className="text-[13px] text-white/50">Aucun joueur dans l'effectif de cette équipe.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {roster.map((entry) => (
            <TeamRosterStatRow
              key={entry.userId}
              displayName={entry.displayName}
              filter={filter}
              attendance={entry.attendance}
              goalsCount={entry.goalsCount}
              cards={entry.cards}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
