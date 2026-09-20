import { DomainError } from '@domain/errors/domain-error'
import { DuplicateRoleAssignmentError } from '@domain/errors/duplicate-role-assignment-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidCredentialsError } from '@domain/errors/invalid-credentials-error'
import { InvalidNewsInputError } from '@domain/errors/invalid-news-input-error'
import { InvalidRoleScopeError } from '@domain/errors/invalid-role-scope-error'
import { InvalidScheduleError } from '@domain/errors/invalid-schedule-error'
import { InvalidSeasonInputError } from '@domain/errors/invalid-season-input-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { OverlappingSeasonError } from '@domain/errors/overlapping-season-error'
import { describe, expect, it } from 'vitest'
import { mapDomainErrorToUiError } from './map-domain-error-to-ui-error'

// Stand-in for a DomainError subclass this mapper has no dedicated branch
// for — exercises the generic DomainError fallback, distinct from the six
// subclasses above and from the final not-a-DomainError-at-all fallback.
class UnmappedDomainError extends DomainError {}

describe('mapDomainErrorToUiError', () => {
  it('maps ForbiddenError to a non-retryable inline error', () => {
    const result = mapDomainErrorToUiError(new ForbiddenError('forbidden'))

    expect(result).toEqual({
      message: "Vous n'êtes plus autorisé à effectuer cette action.",
      variant: 'inline',
      retryable: false,
    })
  })

  it('maps NotFoundError to a non-retryable inline error', () => {
    const result = mapDomainErrorToUiError(new NotFoundError('not found'))

    expect(result).toEqual({
      message: "Cet élément n'existe plus ou a été supprimé.",
      variant: 'inline',
      retryable: false,
    })
  })

  it('maps InvalidCredentialsError to a retryable inline error', () => {
    const result = mapDomainErrorToUiError(new InvalidCredentialsError('bad credentials'))

    expect(result).toEqual({
      message: 'Identifiants incorrects. Vérifiez votre saisie et réessayez.',
      variant: 'inline',
      retryable: true,
    })
  })

  it('maps InvalidScheduleError to a retryable inline error', () => {
    const result = mapDomainErrorToUiError(new InvalidScheduleError('bad schedule'))

    expect(result).toEqual({
      message: 'Le rendez-vous doit précéder le coup d’envoi, le même jour.',
      variant: 'inline',
      retryable: true,
    })
  })

  it('maps InvalidNewsInputError to a retryable inline error', () => {
    const result = mapDomainErrorToUiError(new InvalidNewsInputError('title is required'))

    expect(result).toEqual({
      message: 'Le titre, le contenu et la date sont obligatoires.',
      variant: 'inline',
      retryable: true,
    })
  })

  it('maps InvalidSeasonInputError to a retryable inline error', () => {
    const result = mapDomainErrorToUiError(new InvalidSeasonInputError('startDate must not be after endDate'))

    expect(result).toEqual({
      message:
        'Le libellé et les deux dates sont obligatoires, la date de début doit précéder ou être égale à la date de fin, et la cotisation, si renseignée, doit être un montant positif.',
      variant: 'inline',
      retryable: true,
    })
  })

  it('maps OverlappingSeasonError to a retryable inline error', () => {
    const result = mapDomainErrorToUiError(new OverlappingSeasonError('overlap'))

    expect(result).toEqual({
      message: 'Les dates de cette saison chevauchent une saison existante.',
      variant: 'inline',
      retryable: true,
    })
  })

  it('maps InvalidRoleScopeError to a non-retryable toast error', () => {
    const result = mapDomainErrorToUiError(new InvalidRoleScopeError('bad scope'))

    expect(result).toEqual({
      message: 'Une erreur technique est survenue. Contactez un administrateur si cela persiste.',
      variant: 'toast',
      retryable: false,
    })
  })

  // specs/web-users-role-edit-remove.md §2.2 rule 4/AC-WU-51 — a scope edit
  // landing on a team/section the same account already holds the same role
  // on, surfaced as a retryable inline error (never absorbed in silence).
  it('maps DuplicateRoleAssignmentError to a retryable inline error', () => {
    const result = mapDomainErrorToUiError(new DuplicateRoleAssignmentError('duplicate'))

    expect(result).toEqual({
      message: 'Ce compte porte déjà ce rôle sur cette équipe ou cette section.',
      variant: 'inline',
      retryable: true,
    })
  })

  it('falls back to a generic non-retryable toast error for an unmapped DomainError subclass', () => {
    const result = mapDomainErrorToUiError(new UnmappedDomainError('unmapped'))

    expect(result).toEqual({
      message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
      variant: 'toast',
      retryable: false,
    })
  })

  it('falls back to a generic network/unknown error for anything that is not a DomainError', () => {
    const result = mapDomainErrorToUiError(new TypeError('Failed to fetch'))

    expect(result).toEqual({
      message: 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',
      variant: 'toast',
      retryable: true,
    })
  })
})
