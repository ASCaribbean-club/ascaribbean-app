import { AUDIT_ACTIONS, type AuditAction, isAuditAction } from '@domain/policies/audit-actions'

// specs/web-audit-logs.md §2.3/AC-AU-10 — no French label lives in
// Postgres (the `check` constraint only knows the code, mirrored by
// domain/policies/audit-actions.ts's AUDIT_ACTIONS as-const array). This
// Record is the ONE place a French label is attached to each of the seven
// known codes — `presentation/`, never `domain/` or SQL.
// specs/web-audit-logs.md — 2026-09-30 (fourth addendum) — four labels
// added for the four new emitters (RecordPaymentUseCase/
// ArchiveMembershipUseCase/InviteUserUseCase/GeneratePasswordResetLinkUseCase).
// Exact wording for 'membership.payment_recorded' and 'user.invited' comes
// from the mockup named in that addendum; 'membership.archived' and
// 'password_reset.issued' have no mockup equivalent, proposed here in the
// same register as the other five.
//
// specs/web-audit-logs.md — 2026-09-30 (fifth addendum) — nine more labels,
// for the deliberate scope widening to plain create/edit tracking of
// structural admin data (membership/season/section/team/user). No mockup
// equivalent for any of the nine; proposed here in the same register as
// the eleven existing labels.
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  'health_data.viewed': 'Consultation de données de santé',
  'role.granted': "Attribution d'un rôle",
  'role.revoked': "Retrait d'un rôle",
  'account.deactivated': "Désactivation d'un compte",
  'legacy_points.corrected': 'Correction de points Legacy',
  'export.nominative': 'Export nominatif',
  'purge.executed': "Exécution d'une purge",
  'membership.payment_recorded': 'Paiement enregistré',
  'user.invited': "Invitation d'un utilisateur",
  'membership.archived': "Archivage d'une adhésion",
  'password_reset.issued': "Génération d'un lien de réinitialisation",
  'membership.created': "Création d'une adhésion",
  'membership.updated': "Modification d'une adhésion",
  'season.created': "Création d'une saison",
  'season.updated': "Modification d'une saison",
  'section.created': "Création d'une section",
  'section.updated': "Modification d'une section",
  'team.created': "Création d'une équipe",
  'team.updated': "Modification d'une équipe",
  'user.updated': "Modification d'un utilisateur",
  // specs/web-create-convocation.md AC-WC-32 — a presence entered or corrected by an admin.
  'attendance.updated': "Modification d'une présence",
  // specs/mobile-treasurer.md amendement (4), §E.
  'dues.reminder_sent': 'Relance de cotisation envoyée',
  // specs/mob-treasurer-finances.md AC-FI-21.
  'expense.recorded': "Enregistrement d'une dépense",
  'opening_balance.recorded': "Enregistrement d'un solde d'ouverture",
  'treasury_checkpoint.recorded': "Enregistrement d'un point de trésorerie",
}

// AC-AU-08/AC-AU-11 — never throws: a code absent from AUDIT_ACTIONS
// renders as "Action inconnue (<code brut>)", the raw code shown, not
// swallowed. AUDIT_ACTIONS itself (not this Record's own keys) is what the
// action filter enumerates (§2.3, "le filtre par action propose les codes
// connus") — an unknown code is simply never offered as a filter option,
// while still rendering here whenever no action filter narrows it out.
export function auditActionLabel(code: string): string {
  if (isAuditAction(code)) return AUDIT_ACTION_LABELS[code]
  return `Action inconnue (${code})`
}

// Re-exported so components/AuditLogFilters.tsx doesn't need its own import
// of domain/policies/audit-actions.ts just to enumerate the seven known
// codes for the multi-select checklist.
export { AUDIT_ACTIONS }
