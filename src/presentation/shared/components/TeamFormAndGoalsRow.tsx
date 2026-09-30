import type { MatchOutcome } from '@domain/policies/match-outcome-rules'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface TeamFormAndGoalsRowProps {
  form: MatchOutcome[]
  goalsFor: number
  goalsAgainst: number
}

const FORM_PILL_LABEL: Record<MatchOutcome, string> = {
  win: 'V',
  draw: 'N',
  loss: 'D',
}

const FORM_PILL_COLOR: Record<MatchOutcome, string> = {
  win: 'bg-coach-green',
  draw: 'bg-white/16',
  loss: 'bg-coach-red',
}

// specs/coach-dashboard.md §1 point 7 (PO-1) / specs/player-dashboard.md
// PO-PD-07 — both resolved (développeuse, 2026-09-30): real team data now
// that specs/match-stats.md exists, superseding the earlier `// TODO(PO-1)`
// hardcoded values (AC-CD-05c updated accordingly). Shared between
// coach-dashboard's and player-dashboard's screens (`presentation/shared/`,
// same precedent as ScheduleInfo) — the data is team-scoped, not per-role,
// so one component backs both.
export function TeamFormAndGoalsRow({ form, goalsFor, goalsAgainst }: TeamFormAndGoalsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Card className="gap-2.5 rounded-[18px] border-white/10 bg-white/6 p-3.5">
        <CardHeader className="p-0">
          <CardTitle className="text-[10.5px] font-extrabold tracking-wider text-white/55 uppercase">
            Forme récente
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-1.25 p-0">
          {form.length === 0 ? (
            <p className="m-0 text-[12.5px] font-bold text-white/40">Aucun match enregistré</p>
          ) : (
            form.map((outcome, index) => (
              // Index as key is fine here: `form` is a fresh array from the
              // ViewModel on every render, never reordered/filtered in place.
              <span
                key={index}
                className={`flex size-7 items-center justify-center rounded-[9px] text-xs font-black text-white ${FORM_PILL_COLOR[outcome]}`}
              >
                {FORM_PILL_LABEL[outcome]}
              </span>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="gap-2.25 rounded-[18px] border-white/10 bg-white/6 p-3.5">
        <CardHeader className="p-0">
          <CardTitle className="text-[10.5px] font-extrabold tracking-wider text-white/55 uppercase">
            Buts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0 p-0 text-[12.5px] font-bold text-white/40">
          <p className="m-0">
            <span className="text-[21px] font-black text-coach-green-text">{goalsFor}</span> marqués
          </p>
          <p className="m-0">
            <span className="text-[21px] font-black text-coach-red-text">{goalsAgainst}</span> encaissés
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
