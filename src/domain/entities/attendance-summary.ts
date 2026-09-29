import type { ConvocationType } from './convocation'

// specs/player-stats.md §6.3 — backs get_my_attendance_summary() (RPC,
// SECURITY DEFINER — attendance_records' RLS stays closed to players,
// PO-PS-02 tranché). Two counters only: validatedCount is the denominator
// (attendance_records rows the coach has actually confirmed for this
// player, NOT every scheduled convocation — §6.1), presentCount is the
// numerator (actualStatus === 'present' among those). Never `note`,
// `absenceValidity` or `validatedBy` — those never leave the RPC's return
// shape in the first place (AC-PS-06), this entity has no field for them.
export interface AttendanceSummary {
  validatedCount: number
  presentCount: number
}

// specs/player-stats.md addendum "troisième passage" (PO-PS-12 partiellement
// tranché) — backs get_my_attendance_summary_by_type(). One row per
// convocation type the player has AT LEAST ONE validated attendance_records
// row for this season — never a 0/0 row for a type with none (AC-PS-26/27,
// same "no data" omission as the global AttendanceSummary, AC-PS-17). Same
// two counters as AttendanceSummary, plus `type` — deliberately NOT added as
// an optional field on AttendanceSummary itself: that entity backs a single
// aggregate row, this one backs a list, keeping the two shapes separate
// avoids an awkward `type?: ConvocationType` on a single-row entity.
// ConvocationResponse's own breakdown is explicitly NOT built here — see
// that addendum: the response rate stays unventilated in this same pass.
export interface AttendanceTypeBreakdown {
  type: ConvocationType
  validatedCount: number
  presentCount: number
}
