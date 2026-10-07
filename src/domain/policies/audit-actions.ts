// specs/web-audit-logs.md §2.2/§2.3/AC-AU-09 — mirrors the `check` constraint
// on public.audit_log.action, hand-mirrored, never generated either
// direction (CLAUDE.md §7) — see
// supabase/migrations/20260930125319_web_audit_logs_schema.sql's own
// comment naming THIS file back. Seven codes for the initial pass; the CDC
// §11.3 lines "modification paiement" and "création de compte" had no code
// there on purpose (§2.2, "ne pas les ajouter ici par anticipation").
//
// specs/web-audit-logs.md — 2026-09-30 (fourth addendum) — four more codes,
// added by the pass that built their own emitters
// (RecordPaymentUseCase/ArchiveMembershipUseCase/InviteUserUseCase/
// GeneratePasswordResetLinkUseCase). Mirrors
// supabase/migrations/20260930141222_audit_log_membership_user_actions.sql's
// own widened `audit_log_action_check`.
//
// specs/web-audit-logs.md — 2026-09-30 (fifth addendum) — nine more codes,
// a DELIBERATE widening beyond "sensitive actions only" (§2.1 of the
// initial spec): plain create/edit tracking for structural admin data
// (membership, season, section, team, user) that the original design
// explicitly excluded. Confirmed by the developer after this tradeoff was
// stated — see the addendum for the full reasoning. `news.created`/
// `news.updated` are deliberately NOT included. Mirrors
// supabase/migrations/20260930160000_audit_log_create_edit_actions.sql's
// own widened `audit_log_action_check`.
//
// "wired" below means a real use case calls record() for that code today —
// check it's actually showing up as expected in /admin/audit for a while
// after each new wiring pass ships, since a failed record() call is caught
// and only surfaced via console.error (see e.g. AssignRoleUseCase's own top
// comment) — a silent gap here wouldn't throw anywhere.
export const AUDIT_ACTIONS = [
  'health_data.viewed', // not wired — no emitter exists yet (would be a Postgres trigger, not a use case)
  'role.granted', // wired: AssignRoleUseCase, AssignCoachToTeamsUseCase
  'role.revoked', // wired: RemoveRoleAssignmentUseCase
  'account.deactivated', // not wired — no "deactivate account" use case exists yet
  'legacy_points.corrected', // not wired — no Legacy points correction use case exists yet
  'export.nominative', // not wired — no nominative export use case exists yet
  'purge.executed', // not wired — future service_role retention job, not a use case
  'membership.payment_recorded', // wired: RecordPaymentUseCase
  'user.invited', // wired: InviteUserUseCase
  'membership.archived', // wired: ArchiveMembershipUseCase
  'password_reset.issued', // wired: GeneratePasswordResetLinkUseCase
  'membership.created', // wired: CreateMembershipUseCase
  'membership.updated', // wired: UpdateMembershipUseCase
  'season.created', // wired: CreateSeasonUseCase
  'season.updated', // wired: UpdateSeasonUseCase
  'section.created', // wired: CreateSectionUseCase
  'section.updated', // wired: UpdateSectionUseCase
  'team.created', // wired: CreateTeamUseCase
  'team.updated', // wired: UpdateTeamUseCase
  'user.updated', // wired: UpdateUserUseCase
  // specs/web-create-convocation.md §4/AC-WC-32 — one row per player whose
  // attendance value effectively changes, written by an admin. Mirrors
  // supabase/migrations/20261001120000_web_create_convocation.sql's widened
  // `audit_log_action_check`. convocation.created/updated are NOT added
  // (PO-WC-07, still open).
  'attendance.updated', // wired: RecordAttendanceByAdminUseCase
  // specs/mobile-treasurer.md amendement (4), §E — one entry per reminder
  // EFFECTIVELY sent (outcome 'sent'), emitted by SendDuesRemindersUseCase
  // (business action, never the SQL function). Mirrors
  // supabase/migrations/20261005170100_dues_reminders_audit.sql's widened
  // `audit_log_action_check`.
  'dues.reminder_sent', // wired: SendDuesRemindersUseCase
  // specs/mob-treasurer-finances.md §4/AC-FI-21 (PO-FI-07) — emitted by the
  // use cases (business actions), targeting the created row, metadata never
  // carries a free-text label or debrief. Mirrors
  // supabase/migrations/20261007081032_finances.sql's widened
  // `audit_log_action_check`.
  'expense.recorded', // wired: RecordExpenseUseCase
  'opening_balance.recorded', // wired: RecordOpeningBalanceUseCase
  'treasury_checkpoint.recorded', // wired: RecordTreasuryCheckpointUseCase
  // specs/mob-treasurer-finances-edit.md §4/AC-FIE-14 — corrections and
  // deletions, emitted by the Update*/Delete* use cases. metadata carries
  // before/after STRUCTURED fields only (PO-FIE-03 default): never an expense
  // label or a debrief. Mirrors supabase/migrations/20261007132824_finances_edit.sql's
  // widened `audit_log_action_check`.
  'expense.updated', // wired: UpdateExpenseUseCase
  'expense.deleted', // wired: DeleteExpenseUseCase
  'expense_category.updated', // wired: RenameExpenseCategoryUseCase
  'expense_category.deleted', // wired: DeleteExpenseCategoryUseCase
  'opening_balance.updated', // wired: UpdateOpeningBalanceUseCase
  'treasury_checkpoint.updated', // wired: UpdateTreasuryCheckpointUseCase
  'treasury_checkpoint.deleted', // wired: DeleteTreasuryCheckpointUseCase
  // specs/web-finance-carriers.md §4/AC-FC-17 — emitted by the carrier use
  // cases. metadata: structured fields only (PO-FC-03 default) — never the
  // detail text, never the manager's name. Mirrors
  // supabase/migrations/20261007142228_finance_carriers_admin.sql's widened
  // `audit_log_action_check`.
  'finance_carrier.created', // wired: CreateFinanceCarrierUseCase
  'finance_carrier.updated', // wired: UpdateFinanceCarrierUseCase
  // specs/finances-member-advances.md §4 — metadata: structured fields only,
  // never a member name or an expense label (D-A5). Mirrors
  // supabase/migrations/20261007151442_finances_member_advances.sql's widened
  // `audit_log_action_check` (and record_audit_log_entry for the treasurer on
  // 'expense.reimbursement_updated', PO-FA-21 default).
  'expense.reimbursement_updated', // wired: SetExpenseReimbursementUseCase
  'finance_carrier.archived', // wired: ArchiveFinanceCarrierUseCase
  'finance_carrier.restored', // wired: RestoreFinanceCarrierUseCase
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

// §2.3/AC-AU-08 — a pure guard, never throws. A row can carry a code absent
// from this union (retired, renamed, or written by a version that has since
// been rolled back) — domain/entities/audit-log-entry.ts's own `action:
// string` field (not `AuditAction`) is what makes reading such a row
// possible at all; this guard is what lets presentation/ branch on "known
// vs unknown" without ever throwing on the unknown branch.
export function isAuditAction(code: string): code is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(code)
}
