import { describe, expect, it } from 'vitest'
import { AUDIT_ACTIONS } from '@domain/policies/audit-actions'
import { AUDIT_ACTION_LABELS, auditActionLabel } from './audit-action-labels'

describe('AUDIT_ACTION_LABELS', () => {
  it('carries exactly one French label per known code, no more, no fewer', () => {
    expect(Object.keys(AUDIT_ACTION_LABELS).sort()).toEqual([...AUDIT_ACTIONS].sort())
  })
})

describe('auditActionLabel', () => {
  it('returns the French label for every known code', () => {
    expect(auditActionLabel('role.granted')).toBe("Attribution d'un rôle")
    expect(auditActionLabel('health_data.viewed')).toBe('Consultation de données de santé')
    expect(auditActionLabel('purge.executed')).toBe("Exécution d'une purge")
  })

  // specs/web-audit-logs.md — 2026-09-30 (fourth addendum) — the four codes
  // added for RecordPaymentUseCase/InviteUserUseCase/ArchiveMembershipUseCase/
  // GeneratePasswordResetLinkUseCase's new emitters.
  it('returns the French label for every one of the four new codes', () => {
    expect(auditActionLabel('membership.payment_recorded')).toBe('Paiement enregistré')
    expect(auditActionLabel('user.invited')).toBe("Invitation d'un utilisateur")
    expect(auditActionLabel('membership.archived')).toBe("Archivage d'une adhésion")
    expect(auditActionLabel('password_reset.issued')).toBe("Génération d'un lien de réinitialisation")
  })

  // specs/web-audit-logs.md — 2026-09-30 (fifth addendum) — the nine codes
  // added for CreateMembershipUseCase/UpdateMembershipUseCase/
  // CreateSeasonUseCase/UpdateSeasonUseCase/CreateSectionUseCase/
  // UpdateSectionUseCase/CreateTeamUseCase/UpdateTeamUseCase/
  // UpdateUserUseCase's new emitters.
  it('returns the French label for every one of the nine create/edit codes', () => {
    expect(auditActionLabel('membership.created')).toBe("Création d'une adhésion")
    expect(auditActionLabel('membership.updated')).toBe("Modification d'une adhésion")
    expect(auditActionLabel('season.created')).toBe("Création d'une saison")
    expect(auditActionLabel('season.updated')).toBe("Modification d'une saison")
    expect(auditActionLabel('section.created')).toBe("Création d'une section")
    expect(auditActionLabel('section.updated')).toBe("Modification d'une section")
    expect(auditActionLabel('team.created')).toBe("Création d'une équipe")
    expect(auditActionLabel('team.updated')).toBe("Modification d'une équipe")
    expect(auditActionLabel('user.updated')).toBe("Modification d'un utilisateur")
  })

  // AC-AU-08 — never throws, and shows the raw code rather than swallowing it.
  it('falls back to "Action inconnue (<code>)" for a code outside AUDIT_ACTIONS, without throwing', () => {
    expect(() => auditActionLabel('payment.recorded')).not.toThrow()
    expect(auditActionLabel('payment.recorded')).toBe('Action inconnue (payment.recorded)')
  })

  it('falls back for an empty string too', () => {
    expect(auditActionLabel('')).toBe('Action inconnue ()')
  })
})
