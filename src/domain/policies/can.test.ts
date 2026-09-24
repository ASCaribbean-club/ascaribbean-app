import { describe, expect, it } from 'vitest'
import type { User } from '../entities/user'
import { can } from './can'

function userWith(roles: User['roles']): User {
  return { id: 'u1', fullName: 'Test User', email: 't@example.com', roles, position: null, charterAcceptedAt: null }
}

describe('can', () => {
  it('denies a coach with no assigned teams from creating a convocation', () => {
    const user = userWith([{ role: 'coach', teamIds: [] }])
    expect(can(user, 'convocation:create', { teamId: 'team-1' })).toBe(false)
  })

  it('allows a coach to create a convocation for one of their assigned teams', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'convocation:create', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a section-manager acting outside their own sectionId', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'section:manage', { sectionId: 'section-b' })).toBe(false)
  })

  it('denies a player with no matching teamId from responding to a convocation', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'convocation:respond', { teamId: 'team-2' })).toBe(false)
  })

  it('allows a section-manager to create a convocation for a team in their section', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'convocation:create', { teamId: 'team-1', sectionId: 'section-a' })).toBe(true)
  })

  it('denies a section-manager from creating a convocation for a team outside their section', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'convocation:create', { teamId: 'team-1', sectionId: 'section-b' })).toBe(false)
  })

  // specs/coach-attendance-confirmation.md §2/§7 — same coverage shape as
  // the two 'convocation:create' coach tests above, for the newly-added
  // action. This pair is what proves the can.ts fix actually closes the
  // gap (a coach without this check could "validate" a team they don't
  // coach) rather than just compiling.
  it('allows a coach to validate attendance for one of their assigned teams', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'attendance:validate', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a coach from validating attendance for a team they are not assigned to', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'attendance:validate', { teamId: 'team-2' })).toBe(false)
  })

  // specs/player-vote.md §2/§7 — third occurrence of the same team-scope
  // gap (after 'section-manager' and 'coach' above): this pair proves the
  // 'player' branch's `requiresTeamScope` fix actually covers 'vote:cast',
  // not just 'convocation:respond'.
  it('allows a player to vote on a convocation belonging to their own team', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'vote:cast', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a player from voting on a convocation belonging to another team', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'vote:cast', { teamId: 'team-2' })).toBe(false)
  })

  // specs/web-actus.md §3 — AC-WA-08: 'news:write' is a brand-new, admin-only
  // action, deliberately distinct from 'backoffice:access' (see the comment
  // on both entries) so this pair proves it's actually checked on its own.
  it('allows an admin to write club news', () => {
    const user = userWith([{ role: 'admin' }])
    expect(can(user, 'news:write')).toBe(true)
  })

  it('denies a non-admin role from writing club news, even one with a "Envoyer une communication ciblée" ✅ on the CDC matrix', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'news:write')).toBe(false)
  })

  // specs/section-and-teams.md §3/AC-ST-10 — 'section:write'/'team:write'
  // are accorded to admin and refused to section-manager REGARDLESS of the
  // sectionId passed in context: unlike 'section:manage', these two actions
  // have no scope check in can.ts (the default branch returns true for any
  // role in rbacMatrix, and rbacMatrix only lists 'admin' for both).
  it('allows an admin to write sections and teams', () => {
    const user = userWith([{ role: 'admin' }])
    expect(can(user, 'section:write')).toBe(true)
    expect(can(user, 'team:write')).toBe(true)
  })

  it('denies a section-manager from writing sections, even for their own sectionId in context', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'section:write', { sectionId: 'section-a' })).toBe(false)
  })

  it('denies a section-manager from writing teams, even for their own sectionId in context', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'team:write', { sectionId: 'section-a' })).toBe(false)
  })

  // specs/section-and-teams.md §3/AC-ST-39 — 'role:assign-coach' is granted
  // to admin only, refused to every one of the other seven roles, in
  // particular coach (a coach must not be able to self-assign) and
  // section-manager (no widening by analogy with 'section:manage'),
  // regardless of teamId/sectionId in context.
  it('allows an admin to assign a coach to a team', () => {
    const user = userWith([{ role: 'admin' }])
    expect(can(user, 'role:assign-coach', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a coach from assigning themself (or anyone) to a team', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'role:assign-coach', { teamId: 'team-1' })).toBe(false)
  })

  it('denies a section-manager from assigning a coach, even for a team in their own section', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'role:assign-coach', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
  })

  it('denies every non-admin role from assigning a coach', () => {
    const roles: User['roles'] = [
      { role: 'player', teamId: 'team-1' },
      { role: 'authorized-officer' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'volunteer' },
    ]
    for (const role of roles) {
      const user = userWith([role])
      expect(can(user, 'role:assign-coach')).toBe(false)
    }
  })

  // specs/web-users.md §2.6d/AC-WU-05/AC-WU-06 — 'role:assign' is the NEW,
  // generalized action ('role:assign-coach' above stays untouched, both
  // exist side by side). ['admin']-only in the matrix, mirroring the CDC's
  // "Gérer comptes, rôles, paramétrage" row.
  it('allows an admin to assign a (non-admin) role, regardless of the targeted scope', () => {
    const user = userWith([{ role: 'admin' }])
    expect(can(user, 'role:assign', { teamId: 'team-1' })).toBe(true)
    expect(can(user, 'role:assign', { sectionId: 'section-a' })).toBe(true)
    expect(can(user, 'role:assign')).toBe(true)
  })

  it('denies every non-admin role from assigning a role, including a section-manager acting inside their own section', () => {
    const roles: User['roles'] = [
      { role: 'player', teamId: 'team-1' },
      { role: 'coach', teamIds: ['team-1'] },
      { role: 'section-manager', sectionId: 'section-a' },
      { role: 'authorized-officer' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'volunteer' },
    ]
    for (const role of roles) {
      const user = userWith([role])
      expect(can(user, 'role:assign', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
    }
  })

  // specs/web-users-role-edit-remove.md §2.5b/AC-WU-45 — the amendment's
  // new action, jumeau exact of 'role:assign' above. ['admin']-only in the
  // matrix, mirroring the CDC's "Gérer comptes, rôles, paramétrage" row.
  it('allows an admin to remove a role assignment, regardless of the targeted scope', () => {
    const user = userWith([{ role: 'admin' }])
    expect(can(user, 'role:remove', { teamId: 'team-1' })).toBe(true)
    expect(can(user, 'role:remove', { sectionId: 'section-a' })).toBe(true)
    expect(can(user, 'role:remove')).toBe(true)
  })

  it('denies every non-admin role from removing a role assignment, including a section-manager acting inside their own section', () => {
    const roles: User['roles'] = [
      { role: 'player', teamId: 'team-1' },
      { role: 'coach', teamIds: ['team-1'] },
      { role: 'section-manager', sectionId: 'section-a' },
      { role: 'authorized-officer' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'volunteer' },
    ]
    for (const role of roles) {
      const user = userWith([role])
      expect(can(user, 'role:remove', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
    }
  })

  // specs/match-stats.md §2/AC-01/AC-02 — 'match_result:record' is
  // Coach/Staff only, team-scoped to the coach's own assigned teams.
  it('allows a coach to record a match result for one of their assigned teams', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'match_result:record', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a coach from recording a match result for a team they are not assigned to', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'match_result:record', { teamId: 'team-2' })).toBe(false)
  })

  // AC-MS-09/AC-MS-11 — a Joueur/Joueuse must be denied both
  // 'match_result:record' (no saisie right at all) AND
  // 'match_staff_events:view' (never the staff-only card/penalty_missed
  // events, "absent, jamais grisé").
  it('denies a player from recording a match result', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'match_result:record', { teamId: 'team-1' })).toBe(false)
  })

  it('denies a player from viewing staff-only match events (cards, penalty_missed), even for their own team', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'match_staff_events:view', { teamId: 'team-1' })).toBe(false)
  })

  it('allows a coach to view staff-only match events for one of their assigned teams', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'match_staff_events:view', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a coach from viewing staff-only match events for a team they are not assigned to', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'match_staff_events:view', { teamId: 'team-2' })).toBe(false)
  })

  // 'match_goals:view' — granted to both roles, but still team-scoped for
  // each.
  it('allows a player to view goal events for their own team', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'match_goals:view', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a player from viewing goal events for another team (AC-02)', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'match_goals:view', { teamId: 'team-2' })).toBe(false)
  })

  it('allows a coach to view goal events for one of their assigned teams', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'match_goals:view', { teamId: 'team-1' })).toBe(true)
  })
})
