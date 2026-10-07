import { NotFoundError } from '@domain/errors/not-found-error'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'

// specs/mob-treasurer-finances-edit.md §2 — an entry already deleted, or out of
// the current season, is a dedicated message in the sheet of a correction.
export const ENTRY_GONE_MESSAGE = "Cette saisie n'existe plus ou ne peut plus être modifiée."

export function financeCorrectionErrorMessage(error: unknown): string {
  return error instanceof NotFoundError ? ENTRY_GONE_MESSAGE : mapDomainErrorToUiError(error).message
}
