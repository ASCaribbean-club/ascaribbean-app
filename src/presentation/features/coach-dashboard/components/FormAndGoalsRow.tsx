import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card'

// TODO(PO-1): see specs/coach-dashboard.md §1 point 7 and AC-CD-05c. No
// "résultats et compétitions" module exists yet, so these values are
// hardcoded and identical for every coach regardless of team — this is the
// spec's explicit decision for v1, not an oversight. Replace with a real
// use case + repository once a results module exists; until then don't wire
// this to Convocation/AttendanceRecord data, it has no relationship to them.
const RECENT_FORM: Array<'V' | 'N' | 'D'> = ['V', 'V', 'N', 'D', 'V']
const GOALS_FOR = 12
const GOALS_AGAINST = 6

const FORM_PILL_COLOR: Record<'V' | 'N' | 'D', string> = {
  V: 'bg-coach-green',
  N: 'bg-white/16',
  D: 'bg-coach-red',
}

export function FormAndGoalsRow() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Card className="gap-2.5 rounded-[18px] border-white/10 bg-white/6 p-3.5">
        <CardHeader className="p-0">
          <CardTitle className="text-[10.5px] font-extrabold tracking-wider text-white/55 uppercase">
            Forme récente
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-1.25 p-0">
          {RECENT_FORM.map((result, index) => (
            // Index as key is fine here: RECENT_FORM is a static literal,
            // never reordered/filtered.
            <span
              key={index}
              className={`flex size-7 items-center justify-center rounded-[9px] text-xs font-black text-white ${FORM_PILL_COLOR[result]}`}
            >
              {result}
            </span>
          ))}
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
            <span className="text-[21px] font-black text-coach-green-text">{GOALS_FOR}</span> marqués
          </p>
          <p className="m-0">
            <span className="text-[21px] font-black text-coach-red-text">{GOALS_AGAINST}</span> encaissés
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
