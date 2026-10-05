import type { Season, SeasonLabel } from '../../entities/season'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSeasonInputError } from '../../errors/invalid-season-input-error'
import { can } from '../../policies/can'
import { normalizePaymentUrl } from '../../rules/dues-payment-link-rules'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
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
  // specs/profile-membership-dues.md AC-PMD-17 — optional payment link; a
  // blank string means "no link" (normalized to null), anything else must be
  // an https URL (normalizePaymentUrl, mirrored by the seasons.payment_url
  // CHECK).
  paymentUrl: string | null
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
// specs/web-audit-logs.md — 2026-09-30 (fifth addendum, deliberate scope
// widening beyond "sensitive actions only") — this use case emits
// 'season.updated' below, after the update itself has already committed.
//
// Audit-write failure AFTER the update has already succeeded — same
// tradeoff, and same reasoning, as AssignRoleUseCase's own top comment: no
// shared transaction across the two calls (client-RLS-gated UPDATE on
// seasons vs. a SECURITY DEFINER RPC on audit_log), so the season update
// cannot be rolled back if the audit call fails. Caught and surfaced via
// `console.error`, never rejecting this use case's own promise — the
// business outcome (the season is updated) already succeeded, the
// caller/UI should see success.
export class UpdateSeasonUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly seasonRepository: SeasonRepository,
    private readonly auditLogRepository: AuditLogRepository,
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
    // AC-PMD-17 — rejected from the domain before any network call.
    const paymentUrl = normalizePaymentUrl(input.paymentUrl)

    const season = await this.seasonRepository.update(input.seasonId, {
      label: label as SeasonLabel,
      startDate: input.startDate,
      endDate: input.endDate,
      cotisationAmount: input.cotisationAmount,
      paymentUrl,
    })

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'season.updated',
        targetId: input.seasonId,
        targetType: 'season',
        metadata: { label: input.label },
      })
    } catch (auditError) {
      console.error('UpdateSeasonUseCase: failed to record season.updated audit entry', {
        actorId: input.actorId,
        targetId: input.seasonId,
        auditError,
      })
    }

    return season
  }
}
