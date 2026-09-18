import type { Season, SeasonLabel } from '../../entities/season'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSeasonInputError } from '../../errors/invalid-season-input-error'
import { can } from '../../policies/can'
import type { SeasonRepository } from '../../repositories/season-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface CreateSeasonUseCaseInput {
  actorId: string
  label: string
  startDate: string // ISO date (yyyy-mm-dd, native <input type="date"> value)
  endDate: string // ISO date
  // specs/web-seasons.md §2.7/AC-WS-34 — amendement du 2026-09-17 (2), the
  // dialog's own "Cotisation (€)" field, in euros (a decimal, not integer
  // cents — a developer call, unlike Membership.amountDueCents). Optional:
  // null means "tarif non fixé", distinct from 0 ("gratuit").
  cotisationAmount: number | null
}

// specs/web-seasons.md §2.4/§3 — same authorization-before-validation
// ordering as CreateClubNewsUseCase: an unauthorized caller never learns
// which field would have been rejected. Club-wide action, no team/section
// scope (§3, 'admin' carries no scope field in RoleAssignment) — no context
// object needed here.
//
// §2.4 — this use case deliberately does NOT read existing seasons first to
// pre-check overlap: doing so from the client is a TOCTOU race (two
// concurrent creates could both pass a client-side check before either one
// actually writes), and it would put the "no overlap" rule in two places
// with only one of them authoritative. Overlap is left entirely to
// seasons_no_overlap and surfaces from the database as
// OverlappingSeasonError, already mapped to the existing, already-tested
// inline UI message (data/errors/map-supabase-error.ts, AC-WS-16).
export class CreateSeasonUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly seasonRepository: SeasonRepository,
  ) {}

  async execute(input: CreateSeasonUseCaseInput): Promise<Season> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'season:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write seasons`)
    }

    // AC-WS-10/AC-WS-11 — rejected from the domain (DomainError, not a
    // component-level check), before any network call.
    const label = input.label.trim()
    if (!label) {
      throw new InvalidSeasonInputError('label is required')
    }
    if (!input.startDate) {
      throw new InvalidSeasonInputError('startDate is required')
    }
    if (!input.endDate) {
      throw new InvalidSeasonInputError('endDate is required')
    }
    // §2.4 — no CHECK constraint on public.seasons covers this. Left
    // unvalidated, an inverted date range would fail daterange construction
    // with a Postgres error code map-supabase-error.ts doesn't recognize,
    // surfacing to the admin as "resource not found" for what is really a
    // typo in a date field.
    if (input.startDate > input.endDate) {
      throw new InvalidSeasonInputError('startDate must not be after endDate')
    }
    // AC-WS-34 — mirrors the database's own `cotisation_amount >= 0` check
    // constraint, rejected from the domain first. null is accepted (§2.7,
    // "tarif non fixé"); 0 is a legitimate "gratuit" value, only a
    // non-finite or a negative value is rejected.
    if (input.cotisationAmount !== null && (!Number.isFinite(input.cotisationAmount) || input.cotisationAmount < 0)) {
      throw new InvalidSeasonInputError('cotisationAmount must be a non-negative number, or null')
    }

    return this.seasonRepository.create({
      // SeasonLabel is a template literal type (`${number}-${number}`), not
      // `string` (§2.1/AC-WS-11) — this cast doesn't widen the domain type,
      // it only reflects that the string-shaped form value has already
      // passed the emptiness check above; producing a value that actually
      // MATCHES the pattern is PO-WS-02, still open.
      label: label as SeasonLabel,
      startDate: input.startDate,
      endDate: input.endDate,
      cotisationAmount: input.cotisationAmount,
    })
  }
}
