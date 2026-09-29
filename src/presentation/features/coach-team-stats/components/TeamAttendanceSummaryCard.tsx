import type { TeamAttendanceSummary } from '@domain/usecases/coach-team-stats/GetTeamStatsUseCase'
import { Card } from '@presentation/shared/components/ui/card'
import { VoteResultBar } from '@presentation/shared/components/VoteResultBar'

interface TeamAttendanceSummaryCardProps {
  summary: TeamAttendanceSummary | undefined
}

// UI design §3/§4.3/§5 — "TeamAttendanceSummaryCard". Full-width card: big
// percentage + descriptive label + full-width progress bar. NOT a plain
// reuse of VoteResultBar (that one is a thin h-1.5 bar meant for a list row,
// per its own comment) — this is its own headline-sized bar, same bounded
// 0-100 fill / "never color alone" rule.
//
// ⚠️ PO-CTS-04 ("quel est le dénominateur de l'assiduité ?") — `summary.rate`
// is the value domain/policies/team-stats-rules.ts computes: present count
// across every player, over the number of OPEN convocations (PO-CTS-04(a)/
// (d) tranché, développeuse 2026-09-29) — never a roster-derived "expected
// attendees" figure (PO-CTS-04(b), still open, is why this component does
// not attempt the mockup's separate "15,2 / 18 en moyenne par séance"
// average). Known edge case, accepted by the developer: an open convocation
// with ZERO AttendanceRecord rows still counts toward the denominator, so
// "séance constatée" below can read as 0% for a session whose attendance
// simply hasn't been recorded yet, not one where everyone was absent.
//
// ⚠️ UI-CTS-B (seuils de couleur de la barre) is left OPEN by the spec — no
// numeric threshold is documented anywhere in the CDC. Rather than invent a
// three-tier green/olive/red scale nobody has validated, this bar stays a
// single accent color (`coach-green`) at any rate, exactly the same
// two-state model VoteResultBar already uses — the percentage and fraction
// text next to it are what actually carry the value (AC-CTS-13).
export function TeamAttendanceSummaryCard({ summary }: TeamAttendanceSummaryCardProps) {
  return (
    <Card className="gap-2.5 rounded-[18px] border-white/10 bg-white/6 p-4.5">
      <p className="text-[11px] font-extrabold tracking-wider text-white/55 uppercase">Présence de l'équipe</p>

      {summary === undefined || summary.rate === null ? (
        // AC-CTS-16/AC-CTS-17 — "aucune séance constatée" is a distinct,
        // valid empty state, never a fabricated 0%.
        <p className="text-[13px] text-white/50">Aucune séance constatée pour l'instant sur cette saison.</p>
      ) : (
        <>
          <p className="text-[34px] leading-none font-black text-white">{summary.rate}%</p>
          {/* UI-CTS-C — exact wording left open by the spec pending
              PO-CTS-04; this reuses the spec's own example phrasing
              ("sur les séances constatées de la saison") verbatim rather
              than inventing a different one. */}
          <p className="text-[12.5px] font-semibold text-white/60">Sur les séances constatées de la saison</p>
          <VoteResultBar fillPercentage={summary.rate} emphasize />
          {/* AC-CTS-13 — the bar is always doubled by the exact fraction it
              represents, never color/percentage alone. */}
          <p className="text-[12px] font-bold text-white/50">
            {summary.tally.presentCount} présence{summary.tally.presentCount > 1 ? 's' : ''} sur {summary.tally.totalCount} séance
            {summary.tally.totalCount > 1 ? 's' : ''} constatée{summary.tally.totalCount > 1 ? 's' : ''}
          </p>
        </>
      )}
    </Card>
  )
}
