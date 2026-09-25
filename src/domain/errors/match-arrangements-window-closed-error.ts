import { DomainError } from './domain-error'

// specs/edit-match-details.md §3/§5 — thrown by UpdateMatchDetailsUseCase
// when the "before kickoff" window is already closed at the moment of the
// WRITE (kickoff passed, or convocation.status !== 'open'), never at the
// moment the form was opened (§3, "La soumission est refusée... jamais à
// l'instant de l'ouverture du formulaire"). Deliberately distinct from
// ForbiddenError: this isn't an authorization failure (can()/RLS already
// decided the coach MAY write to this match), it's a business-rule window
// that closed — mapDomainErrorToUiError needs its own, specific copy
// ("Le coup d'envoi est passé...", UI design §4/§5) rather than
// ForbiddenError's generic "vous n'êtes plus autorisé".
export class MatchArrangementsWindowClosedError extends DomainError {}
