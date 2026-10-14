import { DomainError } from '@domain/errors/domain-error'

// docs/specs/asc-legacy.md PO-LG-16 — no points are awarded for a fact dated in
// a season whose Legacy is not fully configured (points mode AND tiers), or in
// no season at all. Thrown by the manual award use case before any write.
export class LegacySeasonNotConfiguredError extends DomainError {}
