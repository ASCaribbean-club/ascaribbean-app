import { describe, expect, it } from 'vitest'
import type { UserRoleRow, UserRow, UserSummaryRow } from '../dto/user-dto'
import { toUser, toUserSummary } from './user-mapper'

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
