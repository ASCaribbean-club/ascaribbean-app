import { DomainError } from './domain-error'

// specs/match-details-missions.md R2/AC-MM-15 — the mission already holds its
// capacity. Raised by data/errors/map-supabase-error.ts from the dedicated
// 'mission_full' refusal of the claim_mission RPC (count + insert happen in
// one transaction there, so two concurrent claims on the last slot never
// both succeed).
export class MissionFullError extends DomainError {}
