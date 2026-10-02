import type { Convocation } from '../entities/convocation'

// specs/match-details-missions.md §2.3/R3/R5b.
//
// ⚠️ ACCEPTED RISK — this rule is enforced in the use cases ONLY
// (ClaimMissionUseCase, ReleaseMissionUseCase), exactly like the response
// deadline in ./response-deadline.ts. No temporal guard exists in SQL on
// mission_assignments for self-service, and that is deliberate, not an
// oversight: bypassing it requires calling the API outside the application,
// and the risk is judged negligible and accepted — a late volunteer mission
// carries no security stake and no sensitive data. (The "§3.1 of the
// convocation spec" the brief cites, a.k.a. convocation-domain-correction.md
// §3.1, is not in the repository; this header refers to response-deadline.ts
// and to specs/match-details-missions.md instead.)
//
// Unlike response-deadline.ts the delay is FIXED for every convocation type.
// Product choice, not measured: see docs/DEFAULTS-A-CHALLENGER.md ("Délai
// d'auto-service de 30 minutes").
export const MISSION_SELF_SERVICE_DEADLINE_MINUTES = 30

const MS_PER_MINUTE = 60_000

// Can a player still register to / withdraw from a mission? True while `now`
// is STRICTLY before (start - 30 min) and the convocation is `open`
// (R5b — hypothesis, PO-MM-03). `isClosed` in the UI is `!` of this; it is
// never a manual switch. Managers (`mission:manage`) are exempt: the callers
// test the action, not this function.
export function isMissionSelfServiceOpen(convocation: Pick<Convocation, 'date' | 'status'>, now: Date): boolean {
  const deadline = new Date(convocation.date).getTime() - MISSION_SELF_SERVICE_DEADLINE_MINUTES * MS_PER_MINUTE
  return now.getTime() < deadline && convocation.status === 'open'
}
