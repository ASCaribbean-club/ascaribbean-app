import type { Season, SeasonLabel } from '../../entities/season'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSeasonInputError } from '../../errors/invalid-season-input-error'
import { can } from '../../policies/can'
import type { SeasonRepository } from '../../repositories/season-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface UpdateSeasonUseCaseInput {
  actorId: string
  seasonId: string
  label: string
  startDate: string // ISO date (yyyy-mm-dd)
  endDate: string // ISO date
  // specs/web-seasons.md §2.7/AC-WS-34 — amendement du 2026-09-17 (2), same
  // field/validation as CreateSeasonUseCaseInput (euros, a decimal). Writable
  // here too, but the seasons_update_admin RLS policy freezes it, like every
  // other column, on a season whose end_date has passed (§2.7 — "le montant
  // d'une saison terminée est figé").
  cotisationAmount: number | null
}

// specs/web-seasons.md §2.3/§3, "La règle « saison terminée non modifiable »
// n'est pas une règle RBAC": WHO may write is 'season:write' (checked below,
// same as CreateSeasonUseCase); WHICH rows are writable is a state that
// changes on its own over time and is deliberately NOT re-checked here. That
// rule lives exclusively in the seasons_update_admin RLS policy's `using`/
// `with check` clauses, evaluated against Postgres' own current_date — never
// against this use case's or the caller's clock. Duplicating it here would
// only add a second, client-clock-trusting copy of a rule the database
// already enforces authoritatively; a stale/forward-set client clock must
// never be able to open up a write the RLS policy would refuse. A rejected
// write on an ended season surfaces as Postgres 42501 -> ForbiddenError,
// already mapped (data/errors/map-supabase-error.ts).
export class UpdateSeasonUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly seasonRepository: SeasonRepository,
  ) {}

  async execute(input: UpdateSeasonUseCaseInput): Promise<Season> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'season:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write seasons`)
    }

    // Same validation as CreateSeasonUseCase (AC-WS-10) — a modification
    // can't leave label/startDate/endDate empty or inverted either. Overlap
    // is, again, never pre-checked here (§2.4) — same TOCTOU reasoning as
    // CreateSeasonUseCase.
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
    if (input.startDate > input.endDate) {
      throw new InvalidSeasonInputError('startDate must not be after endDate')
    }
    // AC-WS-34 — same validation as CreateSeasonUseCase.
    if (input.cotisationAmount !== null && (!Number.isFinite(input.cotisationAmount) || input.cotisationAmount < 0)) {
      throw new InvalidSeasonInputError('cotisationAmount must be a non-negative number, or null')
    }

    // AC-WS-24 — updates the SAME row, never creates a duplicate.
    return this.seasonRepository.update(input.seasonId, {
      label: label as SeasonLabel,
      startDate: input.startDate,
      endDate: input.endDate,
      cotisationAmount: input.cotisationAmount,
    })
  }
}
