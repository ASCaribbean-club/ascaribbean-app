import { describe, expect, it } from 'vitest'
import type { AuditLogEntryRow } from '../dto/audit-log-entry-row'
import { toAuditLogEntry } from './audit-log-entry-mapper'

describe('toAuditLogEntry', () => {
  it('maps every column, a known action, and a resolved actor name', () => {
    const row: AuditLogEntryRow = {
      id: 'entry-1',
      occurred_at: '2026-01-10T10:00:00.000Z',
      actor_id: 'admin-1',
      actor_full_name: 'Compte administrateur',
      action: 'role.granted',
      target_id: 'target-1',
      target_type: 'user',
      source: 'usecase',
      metadata: { role: 'treasurer' },
    }

    expect(toAuditLogEntry(row)).toEqual({
      id: 'entry-1',
      occurredAt: new Date('2026-01-10T10:00:00.000Z'),
      actorId: 'admin-1',
      actorFullName: 'Compte administrateur',
      action: 'role.granted',
      targetId: 'target-1',
      targetType: 'user',
      source: 'usecase',
      metadata: { role: 'treasurer' },
    })
  })

  // 2026-09-30 third addendum — target_type has no CHECK constraint and no
  // union to validate against: null is the pre-existing-row case (written
  // before this column existed).
  it('maps a null target_type without throwing', () => {
    const row: AuditLogEntryRow = {
      id: 'entry-5',
      occurred_at: '2026-01-14T00:00:00.000Z',
      actor_id: 'admin-1',
      actor_full_name: 'Compte administrateur',
      action: 'role.granted',
      target_id: 'target-1',
      target_type: null,
      source: 'usecase',
      metadata: {},
    }

    expect(toAuditLogEntry(row).targetType).toBeNull()
  })

  // AC-AU-08-style guarantee, extended to `source` (2026-09-30 third
  // addendum) — a code absent from AUDIT_SOURCES must still map, carried
  // through as-is, never throwing.
  it('never throws on a source unknown to AUDIT_SOURCES, carrying it through as-is', () => {
    const row: AuditLogEntryRow = {
      id: 'entry-6',
      occurred_at: '2026-01-15T00:00:00.000Z',
      actor_id: null,
      actor_full_name: null,
      action: 'purge.executed',
      target_id: null,
      target_type: null,
      source: 'legacy_script',
      metadata: {},
    }

    expect(() => toAuditLogEntry(row)).not.toThrow()
    expect(toAuditLogEntry(row).source).toBe('legacy_script')
  })

  // Defensive fallback — an unexpected `metadata` shape (here: an array,
  // which is technically `typeof === 'object'` but not a plain object) must
  // never throw and must fall back to `{}`.
  it('falls back to an empty object when metadata is not a plain object', () => {
    const row = {
      id: 'entry-7',
      occurred_at: '2026-01-16T00:00:00.000Z',
      actor_id: null,
      actor_full_name: null,
      action: 'purge.executed',
      target_id: null,
      target_type: null,
      source: 'job',
      metadata: ['unexpected', 'array', 'shape'],
    } as unknown as AuditLogEntryRow

    expect(() => toAuditLogEntry(row)).not.toThrow()
    expect(toAuditLogEntry(row).metadata).toEqual({})
  })

  it('falls back to an empty object when metadata is null', () => {
    const row = {
      id: 'entry-8',
      occurred_at: '2026-01-17T00:00:00.000Z',
      actor_id: null,
      actor_full_name: null,
      action: 'purge.executed',
      target_id: null,
      target_type: null,
      source: 'job',
      metadata: null,
    } as unknown as AuditLogEntryRow

    expect(() => toAuditLogEntry(row)).not.toThrow()
    expect(toAuditLogEntry(row).metadata).toEqual({})
  })

  // AC-AU-08 — a code absent from domain/policies/audit-actions.ts's
  // AUDIT_ACTIONS union must still map without throwing: `action` is
  // carried through as a raw string, never validated here.
  it('never throws on an action code unknown to AUDIT_ACTIONS, carrying it through as-is', () => {
    const row: AuditLogEntryRow = {
      id: 'entry-2',
      occurred_at: '2026-01-11T08:00:00.000Z',
      actor_id: 'admin-1',
      actor_full_name: 'Compte administrateur',
      action: 'payment.recorded',
      target_id: null,
      target_type: null,
      source: 'usecase',
      metadata: {},
    }

    expect(() => toAuditLogEntry(row)).not.toThrow()
    expect(toAuditLogEntry(row).action).toBe('payment.recorded')
  })

  // §2.4/AC-AU-17 — `actor_id`/`actor_full_name` both null (no human actor
  // at all, e.g. a future `purge.executed` row written by the service_role
  // job) must map cleanly, distinguishable from a non-null actorId with an
  // unresolved name (PO-AU-01) by actorId's own nullity.
  it('maps a null actor (no actor_id, no actor_full_name) without throwing', () => {
    const row: AuditLogEntryRow = {
      id: 'entry-3',
      occurred_at: '2026-01-12T00:00:00.000Z',
      actor_id: null,
      actor_full_name: null,
      action: 'purge.executed',
      target_id: null,
      target_type: null,
      source: 'job',
      metadata: {},
    }

    expect(toAuditLogEntry(row)).toEqual({
      id: 'entry-3',
      occurredAt: new Date('2026-01-12T00:00:00.000Z'),
      actorId: null,
      actorFullName: null,
      action: 'purge.executed',
      targetId: null,
      targetType: null,
      source: 'job',
      metadata: {},
    })
  })

  // PO-AU-01 — a non-null actor_id whose join found no name (account
  // disappeared/pseudonymized): distinct from the fully-null case above,
  // and must map without throwing either.
  it('maps a non-null actor_id with an unresolved actor_full_name without throwing', () => {
    const row: AuditLogEntryRow = {
      id: 'entry-4',
      occurred_at: '2026-01-13T00:00:00.000Z',
      actor_id: 'ghost-user-1',
      actor_full_name: null,
      action: 'role.revoked',
      target_id: 'target-2',
      target_type: 'user',
      source: 'usecase',
      metadata: {},
    }

    const result = toAuditLogEntry(row)
    expect(result.actorId).toBe('ghost-user-1')
    expect(result.actorFullName).toBeNull()
  })
})
