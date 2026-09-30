import { describe, expect, it } from 'vitest'
import { AUDIT_SOURCES, isAuditSource } from './audit-sources'

describe('isAuditSource', () => {
  it.each(AUDIT_SOURCES)('returns true for the known source %s', (source) => {
    expect(isAuditSource(source)).toBe(true)
  })

  // Same "never throw on an unknown value" reasoning as isAuditAction — a
  // row can carry a source retired/renamed since it was written.
  it('returns false for a code outside AUDIT_SOURCES', () => {
    expect(isAuditSource('service_role')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isAuditSource('')).toBe(false)
  })
})
