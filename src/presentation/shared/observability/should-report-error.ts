import { DomainError } from '@domain/errors/domain-error'

// Une DomainError est une règle métier attendue (réponse après la clôture,
// saisie invalide…) : ce n'est pas un bug, on ne la remonte pas comme erreur.
// Tout le reste (réseau, erreur inconnue, bug de programmation) l'est.
export function shouldReportError(error: unknown): boolean {
  return !(error instanceof DomainError)
}
