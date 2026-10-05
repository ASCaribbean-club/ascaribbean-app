import type { TeamAttendanceSummary, TeamResponseSummary } from '@domain/usecases/coach-team-stats/GetTeamStatsUseCase'
import type { CardTally } from '@domain/policies/team-stats-rules'
import { Dot } from '@presentation/shared/components/Dot'
import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'
import { VoteResultBar } from '@presentation/shared/components/VoteResultBar'
import { formatCardSummary } from '@presentation/shared/formatters/card-summary'
import type { TeamStatsFilter } from '../useTeamStatsViewModel'

interface TeamRosterStatRowProps {
  displayName: string
  filter: TeamStatsFilter
  // AC-CTS-07 — `null` means no AttendanceRecord at all for this player over
  // the period, rendered as an explicit "Aucune donnée" state, never a 0%.
  attendance: TeamAttendanceSummary | null
  response: TeamResponseSummary | null
  goalsCount: number
  cards: CardTally
}

// UI design §4.1/§5 — "TeamRosterStatRow". Avatar + name identical across
// the three filter states (only the right-hand side changes) — headline
// (big value, mise en avant) + a compact secondary line carrying the two
// OTHER metrics, never a value that disappears from the row entirely
// (AC-CTS-05).
export function TeamRosterStatRow({ displayName, filter, attendance, response, goalsCount, cards }: TeamRosterStatRowProps) {
  const cardSummary = formatCardSummary(cards)

  return (
    <li className="flex flex-col gap-2.5 rounded-2xl border border-white/15 bg-white/8 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <InitialsAvatar name={displayName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-white">{displayName}</p>
        </div>

        {filter === 'presence' && <PresenceHeadline attendance={attendance} />}
        {filter === 'goals' && <p className="shrink-0 text-[20px] font-black text-white">{goalsCount}</p>}
        {filter === 'cards' && <CardsHeadline cards={cards} cardSummary={cardSummary} />}
      </div>

      {/* Présence mode's own bar sits on its own row, full row width, below
          the identity + fraction line above (mockup shape). */}
      {filter === 'presence' && attendance !== null && attendance.rate !== null && (
        <VoteResultBar fillPercentage={attendance.rate} emphasize />
      )}

      {/* Secondary, compact line — always the two metrics NOT currently
          headlined, never omitted (AC-CTS-05). */}
      <p className="truncate text-[11.5px] font-semibold text-white/45">
        {filter === 'presence' && `${formatResponseRate(response)} · ⚽ ${goalsCount} but${goalsCount > 1 ? 's' : ''} · ${cardSummary}`}
        {filter === 'goals' && `${formatPresenceFraction(attendance)} · ${cardSummary}`}
        {filter === 'cards' && `${formatPresenceFraction(attendance)} · ⚽ ${goalsCount} but${goalsCount > 1 ? 's' : ''}`}
      </p>
    </li>
  )
}

function PresenceHeadline({ attendance }: { attendance: TeamAttendanceSummary | null }) {
  if (attendance === null || attendance.rate === null) {
    return <p className="shrink-0 text-[12.5px] font-bold text-white/40">Aucune donnée</p>
  }

  return (
    <div className="shrink-0 text-right">
      <p className="text-[18px] leading-none font-black text-white">{attendance.rate}%</p>
      <p className="text-[11px] font-bold text-white/50">
        {attendance.tally.presentCount}/{attendance.tally.totalCount}
      </p>
    </div>
  )
}

function CardsHeadline({ cards, cardSummary }: { cards: CardTally; cardSummary: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <span className="flex items-center gap-1 text-[13px] font-extrabold text-white">
        <Dot className="size-2.5 bg-coach-amber" />
        {cards.yellowCount}
      </span>
      <span className="flex items-center gap-1 text-[13px] font-extrabold text-white">
        <Dot className="size-2.5 bg-coach-red" />
        {cards.redCount}
      </span>
      <span className="sr-only">{cardSummary}</span>
    </div>
  )
}

// AC-CTS-07 — same "Aucune donnée" wording as PresenceHeadline above, kept
// consistent whichever slot (headline or secondary) ends up showing presence.
function formatPresenceFraction(attendance: TeamAttendanceSummary | null): string {
  if (attendance === null || attendance.rate === null) return 'Aucune donnée de présence'
  return `${attendance.rate}% (${attendance.tally.presentCount}/${attendance.tally.totalCount})`
}

function formatResponseRate(response: TeamResponseSummary | null): string {
  if (response === null || response.rate === null) return 'Réponses : —'
  return `Réponses : ${response.rate}%`
}
