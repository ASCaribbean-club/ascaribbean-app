import { DomainError } from './domain-error'

// specs/section-and-teams.md §2.2/§2.5/AC-ST-11 — thrown by
// CreateTeamUseCase/UpdateTeamUseCase, from the domain and before any
// network call, when name is empty/whitespace-only, or sectionId/seasonId is
// missing ("Section et saison sont obligatoires", §2.2 — the mockup's own
// italic copy, not an arbitrary rule). Same minimal pattern as
// InvalidSeasonInputError, the class carries no logic of its own.
export class InvalidTeamInputError extends DomainError {}
