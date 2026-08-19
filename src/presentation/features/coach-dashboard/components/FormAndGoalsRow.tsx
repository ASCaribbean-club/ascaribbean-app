// TODO(PO-1): see specs/coach-dashboard.md §1 point 7 and AC-CD-05c. No
// "résultats et compétitions" module exists yet, so these values are
// hardcoded and identical for every coach regardless of team — this is the
// spec's explicit decision for v1, not an oversight. Replace with a real
// use case + repository once a results module exists; until then don't wire
// this to Convocation/AttendanceRecord data, it has no relationship to them.
const RECENT_FORM: Array<'V' | 'N' | 'D'> = ['V', 'V', 'N', 'D', 'V']
const GOALS_FOR = 12
const GOALS_AGAINST = 6

export function FormAndGoalsRow() {
  return (
    <div className="coach-dashboard__stats-row">
      <div className="coach-dashboard__stats-card">
        <h2>Forme récente</h2>
        <div className="coach-dashboard__form-pills">
          {RECENT_FORM.map((result, index) => (
            // Index as key is fine here: RECENT_FORM is a static literal,
            // never reordered/filtered.
            <span key={index} className={`coach-dashboard__form-pill coach-dashboard__form-pill--${result}`}>
              {result}
            </span>
          ))}
        </div>
      </div>

      <div className="coach-dashboard__stats-card">
        <h2>Buts</h2>
        <p className="coach-dashboard__goals-line coach-dashboard__goals-line--for">{GOALS_FOR} marqués</p>
        <p className="coach-dashboard__goals-line coach-dashboard__goals-line--against">{GOALS_AGAINST} encaissés</p>
      </div>
    </div>
  )
}
