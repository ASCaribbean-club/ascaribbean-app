import { describe, expect, it } from 'vitest'
import type { AdminUserRow, MembershipCompletenessFactRow, UserCharterFactRow, UserRoleRow, UserRow, UserSummaryRow } from '../dto/user-dto'
import { toAdminUserDirectoryEntry, toMissingElementFacts, toUser, toUserSummary } from './user-mapper'

const userRow: UserRow = {
  id: 'u1',
  full_name: 'Test User',
  email: 't@example.com',
  position: null,
  charter_accepted_at: null,
}

describe('toUser', () => {
  it('maps charter_accepted_at null to null', () => {
    expect(toUser(userRow, []).charterAcceptedAt).toBeNull()
  })

  it('maps charter_accepted_at to a Date when set', () => {
    const row: UserRow = { ...userRow, charter_accepted_at: '2026-08-13T00:00:00.000Z' }
    expect(toUser(row, []).charterAcceptedAt).toEqual(new Date('2026-08-13T00:00:00.000Z'))
  })

  it('maps a set position through unchanged', () => {
    const row: UserRow = { ...userRow, position: 'midfielder' }
    expect(toUser(row, []).position).toBe('midfielder')
  })

  it('maps a player row to a single teamId assignment', () => {
    const roleRows: UserRoleRow[] = [{ role: 'player', team_id: 'team-1', section_id: null }]
    expect(toUser(userRow, roleRows).roles).toEqual([{ role: 'player', teamId: 'team-1' }])
  })

  it('collapses multiple coach rows into one assignment with teamIds', () => {
    const roleRows: UserRoleRow[] = [
      { role: 'coach', team_id: 'team-1', section_id: null },
      { role: 'coach', team_id: 'team-2', section_id: null },
    ]
    expect(toUser(userRow, roleRows).roles).toEqual([{ role: 'coach', teamIds: ['team-1', 'team-2'] }])
  })

  it('maps a section-manager row to a sectionId assignment', () => {
    const roleRows: UserRoleRow[] = [{ role: 'section-manager', team_id: null, section_id: 'section-a' }]
    expect(toUser(userRow, roleRows).roles).toEqual([{ role: 'section-manager', sectionId: 'section-a' }])
  })

  it('maps club-wide roles with no scope field', () => {
    const roleRows: UserRoleRow[] = [{ role: 'treasurer', team_id: null, section_id: null }]
    expect(toUser(userRow, roleRows).roles).toEqual([{ role: 'treasurer' }])
  })

  it('handles a multi-role account (club-wide + team-scoped)', () => {
    const roleRows: UserRoleRow[] = [
      { role: 'admin', team_id: null, section_id: null },
      { role: 'player', team_id: 'team-1', section_id: null },
    ]
    expect(toUser(userRow, roleRows).roles).toEqual([{ role: 'admin' }, { role: 'player', teamId: 'team-1' }])
  })
})

// specs/section-and-teams.md §2.11/PO-ST-12b
describe('toUserSummary', () => {
  // specs/web-memberships.md §2.10/§4 — email added for MembershipEditRow's
  // read-only field (amendement du 2026-09-17).
  it('maps id, full_name and email', () => {
    const row: UserSummaryRow = { id: 'u1', full_name: 'Test User', email: 'user@example.test' }
    expect(toUserSummary(row)).toEqual({ id: 'u1', fullName: 'Test User', email: 'user@example.test' })
  })
})

// specs/web-users.md §2.2/§2.10
describe('toAdminUserDirectoryEntry', () => {
  const adminUserRow: AdminUserRow = { id: 'u1', full_name: 'Test User', email: 't@example.com', charter_accepted_at: null }
  const facts = { hasRole: true, hasMembershipForCurrentSeason: true, hasLicenceNumberForCurrentSeason: true, charterAccepted: false }

  it('maps id/fullName/email/charterAcceptedAt and reuses toUser’s own role aggregation', () => {
    const roleRows: UserRoleRow[] = [{ role: 'section-manager', team_id: null, section_id: 'section-a' }]
    const entry = toAdminUserDirectoryEntry(adminUserRow, roleRows, facts)

    expect(entry).toEqual({
      id: 'u1',
      fullName: 'Test User',
      email: 't@example.com',
      charterAcceptedAt: null,
      roles: [{ role: 'section-manager', sectionId: 'section-a' }],
      missingElementFacts: facts,
    })
  })

  it('maps charter_accepted_at to a Date when set', () => {
    const row: AdminUserRow = { ...adminUserRow, charter_accepted_at: '2026-08-13T00:00:00.000Z' }
    expect(toAdminUserDirectoryEntry(row, [], facts).charterAcceptedAt).toEqual(new Date('2026-08-13T00:00:00.000Z'))
  })

  it('carries the given facts through unchanged, never recomputing them', () => {
    expect(toAdminUserDirectoryEntry(adminUserRow, [], facts).missingElementFacts).toBe(facts)
  })
})

// specs/web-users.md §2.3/AC-WU-37
describe('toMissingElementFacts', () => {
  const userRow: UserCharterFactRow = { id: 'u1', charter_accepted_at: null }
  const membershipRow: MembershipCompletenessFactRow = { user_id: 'u1', licence_number: 'FR-12345' }

  it('is false on every current-season fact when there is no current season, even with a membership row somehow passed in', () => {
    const facts = toMissingElementFacts(userRow, true, membershipRow, null)
    expect(facts.hasMembershipForCurrentSeason).toBe(false)
    expect(facts.hasLicenceNumberForCurrentSeason).toBe(false)
  })

  it('is true for hasMembershipForCurrentSeason when a membership row exists for the current season', () => {
    const facts = toMissingElementFacts(userRow, true, membershipRow, 'season-1')
    expect(facts.hasMembershipForCurrentSeason).toBe(true)
    expect(facts.hasLicenceNumberForCurrentSeason).toBe(true)
  })

  it('is false for hasMembershipForCurrentSeason when no membership row was found', () => {
    const facts = toMissingElementFacts(userRow, true, undefined, 'season-1')
    expect(facts.hasMembershipForCurrentSeason).toBe(false)
    expect(facts.hasLicenceNumberForCurrentSeason).toBe(false)
  })

  // §2.3 criterion 3 — a membership exists but its licence_number is null.
  it('is false for hasLicenceNumberForCurrentSeason when the membership row has a null licence_number', () => {
    const facts = toMissingElementFacts(userRow, true, { user_id: 'u1', licence_number: null }, 'season-1')
    expect(facts.hasMembershipForCurrentSeason).toBe(true)
    expect(facts.hasLicenceNumberForCurrentSeason).toBe(false)
  })

  it('maps charterAccepted from charter_accepted_at nullity', () => {
    expect(toMissingElementFacts(userRow, true, undefined, null).charterAccepted).toBe(false)
    expect(toMissingElementFacts({ ...userRow, charter_accepted_at: '2026-01-01T00:00:00.000Z' }, true, undefined, null).charterAccepted).toBe(
      true,
    )
  })

  it('passes hasRole through unchanged', () => {
    expect(toMissingElementFacts(userRow, false, undefined, null).hasRole).toBe(false)
    expect(toMissingElementFacts(userRow, true, undefined, null).hasRole).toBe(true)
  })
})
