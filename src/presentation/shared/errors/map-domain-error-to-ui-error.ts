import { ArchivedMembershipHasPaymentsError } from '@domain/errors/archived-membership-has-payments-error'
import { DomainError } from '@domain/errors/domain-error'
import { DuplicateMembershipError } from '@domain/errors/duplicate-membership-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidCoachAssignmentInputError } from '@domain/errors/invalid-coach-assignment-input-error'
import { InvalidCredentialsError } from '@domain/errors/invalid-credentials-error'
import { InvalidMembershipInputError } from '@domain/errors/invalid-membership-input-error'
import { InvalidNewsInputError } from '@domain/errors/invalid-news-input-error'
import { InvalidPaymentInputError } from '@domain/errors/invalid-payment-input-error'
import { InvalidRoleScopeError } from '@domain/errors/invalid-role-scope-error'
import { InvalidScheduleError } from '@domain/errors/invalid-schedule-error'
import { InvalidSeasonInputError } from '@domain/errors/invalid-season-input-error'
import { InvalidSectionInputError } from '@domain/errors/invalid-section-input-error'
import { InvalidTeamInputError } from '@domain/errors/invalid-team-input-error'
import { MembershipActivationRequirementsNotMetError } from '@domain/errors/membership-activation-requirements-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { OverlappingSeasonError } from '@domain/errors/overlapping-season-error'
import type { UiError } from './ui-error'

// Next hop after data/errors/map-supabase-error.ts: that file stops at
// DomainError, this one goes from DomainError to what a screen shows.
// DomainError subclasses are a class hierarchy, not a discriminated union
// with a `code` field (see docs/DEFAULTS-A-CHALLENGER.md), so this is an
// instanceof chain with a generic fallback rather than an exhaustive
// switch — most-specific-first isn't load-bearing today since none of
// these subclass each other, but keep new branches above the DomainError
// fallback if that ever changes.
export function mapDomainErrorToUiError(error: unknown): UiError {
  if (error instanceof ForbiddenError) {
    return {
      message: "Vous n'êtes plus autorisé à effectuer cette action.",
      variant: 'inline',
      retryable: false,
    }
  }

  if (error instanceof NotFoundError) {
    return {
      message: "Cet élément n'existe plus ou a été supprimé.",
      variant: 'inline',
      retryable: false,
    }
  }

  if (error instanceof InvalidCredentialsError) {
    return {
      message: 'Identifiants incorrects. Vérifiez votre saisie et réessayez.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof InvalidScheduleError) {
    // Same copy as useCreateConvocationViewModel's local toFieldErrorMessage
    // for this error — now the shared default instead of a one-off.
    return {
      message: 'Le rendez-vous doit précéder le coup d’envoi, le même jour.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof InvalidNewsInputError) {
    // specs/web-actus.md AC-WA-11/AC-WA-20 — generic French copy for the
    // domain's title/details/publishedAt validation, shown at the top of
    // NewsFormDialog. Not field-specific: the dialog's own `required`
    // attributes already prevent the common case client-side, this only
    // fires on the rarer race the use case is the real authority for.
    return {
      message: 'Le titre, le contenu et la date sont obligatoires.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof InvalidSeasonInputError) {
    // specs/web-seasons.md §2.4/AC-WS-10, UI design "États du dialogue" —
    // the text this spec itself flags as missing ("le texte du message
    // n'est pas encore écrit dans mapDomainErrorToUiError"). Covers every
    // domain-level rejection CreateSeasonUseCase/UpdateSeasonUseCase can
    // throw: empty label, a missing date, startDate after endDate, and
    // (AC-WS-34, amendement du 2026-09-17 (2)) an invalid cotisation amount
    // — generic copy rather than a field-specific one, same reasoning as
    // InvalidNewsInputError above (the dialog's own `required`/`min`
    // attributes already prevent the common cases client-side).
    return {
      message:
        'Le libellé et les deux dates sont obligatoires, la date de début doit précéder ou être égale à la date de fin, et la cotisation, si renseignée, doit être un montant positif.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof OverlappingSeasonError) {
    return {
      message: 'Les dates de cette saison chevauchent une saison existante.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof InvalidSectionInputError) {
    // specs/section-and-teams.md §2.5/AC-ST-11 — generic copy, same
    // reasoning as InvalidNewsInputError/InvalidSeasonInputError above: the
    // dialog's own `required` attributes already prevent the common empty
    // case client-side, this only fires on the rarer race the use case is
    // the real authority for.
    return {
      message: 'Le nom et le type de sport sont obligatoires.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof InvalidTeamInputError) {
    // specs/section-and-teams.md §2.2 — the mockup's own italic copy
    // ("Section et saison sont obligatoires : une équipe est propre à une
    // saison et n'est jamais réutilisée d'une saison à l'autre"), reused
    // verbatim as the failure message rather than a generic one.
    return {
      message: 'Le nom, la section et la saison sont obligatoires : une équipe est propre à une saison.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof InvalidCoachAssignmentInputError) {
    // specs/section-and-teams.md §2.10/AC-ST-40/AC-ST-47 — fires when the
    // dialog is submitted with no team checked.
    return {
      message: 'Choisissez un utilisateur et au moins une équipe.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof InvalidMembershipInputError) {
    // specs/web-memberships.md §2.1/AC-WM-15 — generic copy, same reasoning
    // as InvalidSeasonInputError/InvalidTeamInputError above: the dialog's
    // own `required` attributes already prevent the common empty-field case
    // client-side, this only fires on the rarer race the use case is the
    // real authority for. Never mentions licenceNumber — that field is
    // deliberately optional (§2.1) and never the cause of this error.
    return {
      message: "L'utilisateur, la saison, le statut et la date de validité sont obligatoires.",
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof InvalidPaymentInputError) {
    // specs/web-memberships.md §2.2/AC-WM-16 — shown at the top of
    // RecordPaymentDialog.
    return {
      message: 'Le montant doit être strictement positif et la date de paiement est obligatoire.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof MembershipActivationRequirementsNotMetError) {
    // specs/web-memberships.md §2.4/AC-WM-35/AC-WM-36 (amendement du
    // 2026-09-17) — shown in the edit row's own Alert (or the create
    // dialog's), same reasoning as AC-WM-25/AC-WM-36's own "reconduction":
    // the saisies stay, only this message appears.
    return {
      message: 'Le statut « Active » exige une licence renseignée et une cotisation intégralement réglée.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof DuplicateMembershipError) {
    // specs/web-memberships.md §2.7/AC-WM-07 — memberships_user_season_active_idx.
    return {
      message: 'Une adhésion existe déjà pour cet utilisateur sur cette saison.',
      variant: 'inline',
      retryable: true,
    }
  }

  if (error instanceof ArchivedMembershipHasPaymentsError) {
    // specs/web-memberships.md §2.7/PO-WM-03 — genuinely blocking, not
    // guessed at: this is the exact case this pass leaves unimplemented
    // (an archived membership for this (user, season) pair already carries
    // recorded payments). The copy says so plainly rather than pretending
    // it's a validation error the admin can just fix by retyping.
    return {
      message:
        'Une adhésion archivée existe déjà pour cet utilisateur sur cette saison et porte des paiements enregistrés — ce cas n’est pas encore pris en charge, contactez un administrateur technique.',
      variant: 'inline',
      retryable: false,
    }
  }

  if (error instanceof InvalidRoleScopeError) {
    // Should only fire from a bug in role-assignment (see the comment above
    // this case in data/errors/map-supabase-error.ts) — never a user-fixable
    // situation, hence the generic copy and no retry.
    return {
      message: 'Une erreur technique est survenue. Contactez un administrateur si cela persiste.',
      variant: 'toast',
      retryable: false,
    }
  }

  if (error instanceof DomainError) {
    return {
      message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
      variant: 'toast',
      retryable: false,
    }
  }

  return {
    message: 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',
    variant: 'toast',
    retryable: true,
  }
}
