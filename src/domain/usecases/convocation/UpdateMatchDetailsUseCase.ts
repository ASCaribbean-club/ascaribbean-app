import type { ConvocationArrangements } from '@domain/entities/convocation'
import type { MatchArrangements, MatchDetails } from '@domain/entities/match-details'
import { InvalidScheduleError } from '@domain/errors/invalid-schedule-error'
import { MatchArrangementsWindowClosedError } from '@domain/errors/match-arrangements-window-closed-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { isValidMatchSchedule } from '@domain/policies/match-scheduling-rules'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import { isPastDate } from '@domain/rules/convocation-rules'

export interface UpdateMatchDetailsInput {
  convocationId: string
  arrangements: MatchArrangements
  // Developer decision (2026-09-25), widening specs/edit-match-details.md's
  // original scope: OPTIONAL — when provided, the convocation's own
  // kickoff (`date`) and venue (`location`) are corrected too, in the SAME
  // window/type checks below, written BEFORE the MatchArrangements write so
  // step 4's schedule check compares the RDV against the NEW kickoff, not
  // the stale one read in step 1. Omitted, behavior is byte-for-byte
  // unchanged from before this addition.
  convocationArrangements?: ConvocationArrangements
  // Passed in, never read via `new Date()` inside this class — same
  // convention as RespondToConvocationUseCase/ConfirmAttendanceUseCase
  // (CLAUDE.md §3: domain/ stays testable in Node with no fake clock).
  now: Date
}

// specs/edit-match-details.md §5 — a coach correcting a match's logistics
// (isHome/meetingPointTime/meetingPointLocation) before kickoff. §5 also
// states, explicitly, what this use case does NOT do: it does not call
// `can()` — authorization is `usePermission('match_details:update', …)` in
// presentation/ (render gate) and the mirrored RLS policy (real gate), same
// split already used for ConfirmAttendanceUseCase's read-side counterpart.
// Adding a third check here would only give the false impression of a
// second layer of application-level security. Same split applies to the
// optional `convocationArrangements` write added 2026-09-25 — gated by
// `usePermission('convocation:update', …)` in presentation/ and the mirrored
// RLS policy, not re-checked here either.
export class UpdateMatchDetailsUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly matchDetailsRepository: MatchDetailsRepository,
  ) {}

  async execute(input: UpdateMatchDetailsInput): Promise<MatchDetails> {
    // 1. Re-read the Convocation — needed for date/status/type. `null` and
    // "exists but out of the caller's RLS scope" collapse into the same
    // NotFoundError, same "sans distinguer inexistant et hors périmètre"
    // treatment as GetConvocationWithDetailsUseCase (AC-MD-01).
    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) {
      throw new NotFoundError(`Convocation ${input.convocationId} not found.`)
    }

    // 2. Only a `match` convocation carries a MatchDetails row to correct
    // (AC-EM-11) — same NotFoundError, not a distinct error class: from the
    // caller's perspective "there's nothing here to edit" is exactly as
    // final as "this convocation doesn't exist".
    if (convocation.type !== 'match') {
      throw new NotFoundError(`Convocation ${input.convocationId} is not a match convocation.`)
    }

    // 3. The "avant que le match commence" window (§3) — Convocation.date
    // not passed AND status still 'open', both evaluated against `now`
    // passed by the caller (§3, "à l'instant de l'écriture, jamais à
    // l'instant de l'ouverture du formulaire"). This is level 2 of the
    // spec's three-level defense (render gate, this check, then RLS as the
    // real barrier) — still a client clock, not a security boundary on its
    // own. Checked against the ORIGINAL convocation.date — the window that
    // must still be open is the one this write is happening under, not
    // whatever new kickoff is being submitted.
    if (isPastDate(convocation.date, input.now) || convocation.status !== 'open') {
      throw new MatchArrangementsWindowClosedError(
        `Match details for convocation ${input.convocationId} can no longer be edited: kickoff has passed or the convocation is not open.`,
      )
    }

    // 3b. Developer decision (2026-09-25) — the convocation's own
    // kickoff/location, corrected FIRST so step 4 below validates the RDV
    // against the NEW kickoff. `effectiveKickoff` falls back to the
    // already-read `convocation.date` when no convocationArrangements were
    // submitted, so this whole block is a no-op for the original,
    // MatchDetails-only call shape.
    const effectiveKickoff = input.convocationArrangements
      ? (await this.convocationRepository.updateArrangements(convocation.id, input.convocationArrangements)).date
      : convocation.date

    // 4. The RDV/kickoff ordering rule (specs/create-convocation.md §5,
    // PO-CV-09) applies to the modification exactly as it did to creation —
    // reused as-is, nothing new written (§3). Coach feedback (2026-09-25):
    // the RDV is now optional, so this only applies when one is actually
    // being set — clearing it back to unset has nothing to validate.
    if (
      input.arrangements.meetingPointTime &&
      !isValidMatchSchedule(new Date(input.arrangements.meetingPointTime), new Date(effectiveKickoff))
    ) {
      throw new InvalidScheduleError(`Meeting point time is not before kickoff, the same day: ${input.convocationId}`)
    }

    // 5. Narrow write — never `upsert` (§5): a Pick<> of exactly the three
    // logistics fields, structurally unable to touch opponentId.
    return this.matchDetailsRepository.updateArrangements(input.convocationId, input.arrangements)
  }
}
