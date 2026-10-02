import { DomainError } from './domain-error'

// specs/match-details-missions.md R3 — the self-service window (30 minutes
// before the convocation starts) is over. Thrown by ClaimMissionUseCase and
// ReleaseMissionUseCase only; never exists on the database side (accepted
// risk, see domain/policies/mission-deadline.ts).
export class MissionDeadlinePassedError extends DomainError {}
