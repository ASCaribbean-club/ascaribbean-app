import type { DeclaredStatus } from '@domain/entities/convocation'
import type { ResponseCounts } from '@domain/rules/convocation-rules'

// Discriminated union so CalendarConvocationRow can pick which of
// ResponseBar / ResponseActions / ResponseStatusPill to render per row
// without re-deriving the role or the past/upcoming split itself (§2
// "Variantes de rendu par rôle" — that split is useCalendarViewModel's
// job, not this component's, same ARCHITECTURE.md §6 rule as everywhere
// else). One variant per row, never more than one rendered at once — the
// spec is explicit that a joueur/joueuse row never shows an aggregate and
// a coach row never shows an individual status (§2, §3).
export type CalendarResponseBlock =
  // Coach view — team-wide aggregate, every row, upcoming or past alike
  // (the barre itself has no "read-only past" variant, AC-CA-03: it's
  // always computed from ConvocationResponse, never from an
  // AttendanceRecord regardless of whether the date has passed).
  | { kind: 'coach'; counts: ResponseCounts }
  // Player view, within the response window (canPlayerRespond true) — the
  // real Présent/Absent action pair. `canRespond` is still threaded through
  // rather than hardcoded true here: ResponseActions already knows how to
  // render its own "Vous avez répondu…" fallback for the (rarer) case of an
  // upcoming-but-deadline-passed convocation, and there's no reason to
  // duplicate that here.
  | {
      kind: 'player-actions'
      canRespond: boolean
      myResponse: DeclaredStatus | null
      onRespondPresent: () => void
      onRespondAbsent: () => void
    }
  // Player view, PAST convocation (PO-CA-02) — read-only pill, never the
  // button pair. Distinct from `player-actions` with `canRespond: false`
  // specifically because PO-CA-02 asks for the compact top-right pill
  // (export `_3`), not ResponseActions' own full-width text fallback.
  | { kind: 'player-readonly'; myResponse: DeclaredStatus | null }
