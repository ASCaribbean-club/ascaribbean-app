import { describe, expect, it } from 'vitest'
import type { User } from '../entities/user'
import { can } from './can'

function userWith(roles: User['roles']): User {
  return { id: 'u1', fullName: 'Test User', email: 't@example.com', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
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

  // specs/edit-match-details.md §2/§10 — fourth occurrence of the same
  // team-scope gap (after 'convocation:create', 'attendance:validate',
  // 'vote:cast'): this pair proves the 'coach' branch's `requiresTeamScope`
  // fix actually covers 'match_details:update', not just the three others.
  it('allows a coach to update match details for one of their assigned teams', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'match_details:update', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a coach from updating match details for a team they are not assigned to', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'match_details:update', { teamId: 'team-2' })).toBe(false)
  })

  // §2 — ['coach'] is the ONLY role granted in rbacMatrix for this action in
  // this pass (PO-EM-01 left open): every other role must be denied
  // regardless of any scope passed in context, including a section-manager
  // acting inside their own section (the pre-wired can.ts branch, §2 "quatrième
  // occurrence exacte du même écart" for 'section-manager', stays inert
  // until PO-EM-01 widens the matrix entry).
  it('allows a coach to delete a convocation for one of their assigned teams only', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'convocation:delete', { teamId: 'team-1' })).toBe(true)
    expect(can(user, 'convocation:delete', { teamId: 'team-2' })).toBe(false)
  })

  // specs/web-create-convocation.md AC-WC-04 — 'admin' now holds this action
  // (club-wide); every OTHER non-coach role is still denied.
  it('denies every non-coach, non-admin role from updating match details, including a section-manager acting inside their own section', () => {
    const roles: User['roles'] = [
      { role: 'player', teamId: 'team-1' },
      { role: 'section-manager', sectionId: 'section-a' },
      { role: 'authorized-officer' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'volunteer' },
    ]
    for (const role of roles) {
      const user = userWith([role])
      expect(can(user, 'match_details:update', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
    }
  })

  // specs/edit-match-details.md, developer decision (2026-09-25) — jumeau
  // exact of the 'match_details:update' pair above, same team-scope gap.
  it('allows a coach to update a convocation for one of their assigned teams', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'convocation:update', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a coach from updating a convocation for a team they are not assigned to', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'convocation:update', { teamId: 'team-2' })).toBe(false)
  })

  // specs/web-create-convocation.md AC-WC-04 — 'admin' now holds this action
  // (club-wide); every OTHER non-coach role is still denied.
  it('denies every non-coach, non-admin role from updating a convocation, including a section-manager acting inside their own section', () => {
    const roles: User['roles'] = [
      { role: 'player', teamId: 'team-1' },
      { role: 'section-manager', sectionId: 'section-a' },
      { role: 'authorized-officer' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'volunteer' },
    ]
    for (const role of roles) {
      const user = userWith([role])
      expect(can(user, 'convocation:update', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
    }
  })

  // specs/player-stats.md §2, AC-PS-20 — the two new actions are
  // PERSON-scoped (auth.uid() inside the RPC), never team-scoped: this pair
  // proves can() grants them to a player with NO teamId in context at all,
  // unlike every other 'player' action tested above (convocation:respond,
  // vote:cast, match_goals:view) which all REQUIRE a matching teamId. If a
  // future change accidentally adds these to can.ts's `requiresTeamScope`,
  // this test starts failing (both would wrongly return false with no
  // context.teamId supplied) — that's the point.
  it('allows a player to read their own attendance/response summaries with no teamId in context (AC-PS-20)', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'attendance:read-own-summary', {})).toBe(true)
    expect(can(user, 'response:read-own-summary', {})).toBe(true)
  })

  it('allows a player with zero roles worth of team context to still read their own summaries', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    // Deliberately passing a teamId that matches NOTHING — proves the check
    // isn't silently comparing against it either.
    expect(can(user, 'attendance:read-own-summary', { teamId: 'some-other-team' })).toBe(true)
    expect(can(user, 'response:read-own-summary', { teamId: 'some-other-team' })).toBe(true)
  })

  // specs/player-stats.md addendum "PO-PS-03 tranché" — third person-scoped
  // action, same shape as the pair above (AC-PS-20's reasoning extended).
  it('allows a player to read their own card counts with no teamId in context (PO-PS-03 tranché)', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'match_cards:view-own', {})).toBe(true)
    expect(can(user, 'match_cards:view-own', { teamId: 'some-other-team' })).toBe(true)
  })

  // specs/coach-team-stats.md §2/AC-CTS-03 — 'team_stats:view' is the
  // feature's only new action, Coach/Staff only, scoped to the coach's own
  // assigned teams. This pair proves the 'coach' branch's `requiresTeamScope`
  // fix actually covers it, not just the six actions already listed there.
  it('allows a coach to view team stats for one of their assigned teams', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'team_stats:view', { teamId: 'team-1' })).toBe(true)
  })

  // AC-CTS-03's own explicit example: "un coach de l'équipe A obtient false
  // pour can(user, 'team_stats:view', { teamId: B })".
  it('denies a coach from viewing team stats for a team they are not assigned to (AC-CTS-03)', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'team_stats:view', { teamId: 'team-2' })).toBe(false)
  })

  // AC-CTS-02 — for every other role, the screen and its entry point are
  // ABSENT, never merely grayed out: this proves can() actually returns
  // false for each of them, regardless of any scope passed in context.
  it('denies every non-coach role from viewing team stats, including a section-manager acting inside their own section (PO-CTS-05, assumed gap)', () => {
    const roles: User['roles'] = [
      { role: 'player', teamId: 'team-1' },
      { role: 'section-manager', sectionId: 'section-a' },
      { role: 'authorized-officer' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'volunteer' },
      { role: 'admin' },
    ]
    for (const role of roles) {
      const user = userWith([role])
      expect(can(user, 'team_stats:view', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
    }
  })

  // specs/web-audit-logs.md §3/AC-AU-20 — 'audit:read' is ['admin']-only,
  // club-wide (no scope check, same as 'backoffice:access'/'season:write').
  it('allows an admin to read the audit log', () => {
    const user = userWith([{ role: 'admin' }])
    expect(can(user, 'audit:read')).toBe(true)
  })

  it('denies every non-admin role from reading the audit log, including a multi-role account without admin', () => {
    // §3 "Comptes multi-rôles" — cumulating several non-admin roles never
    // adds up to admin access; the one role whose consultations this
    // journal traces (medical-referent) is deliberately included, §3's own
    // "le rôle dont les consultations sont tracées n'est pas celui qui lit
    // la trace".
    const multiRoleWithoutAdmin = userWith([
      { role: 'coach', teamIds: ['team-1'] },
      { role: 'medical-referent' },
      { role: 'treasurer' },
    ])
    expect(can(multiRoleWithoutAdmin, 'audit:read')).toBe(false)

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
      expect(can(user, 'audit:read')).toBe(false)
    }
  })

  it('allows an admin+coach multi-role account to read the audit log regardless of order or scope', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }, { role: 'admin' }])
    expect(can(user, 'audit:read')).toBe(true)
  })

  // specs/web-localizations.md §3/AC-WL-09 — 'training_location:write' is
  // ['admin']-only and club-wide (no scope check, same as 'season:write').
  it('allows an admin to write training locations', () => {
    expect(can(userWith([{ role: 'admin' }]), 'training_location:write')).toBe(true)
  })

  it('denies coach and section-manager from writing training locations', () => {
    expect(can(userWith([{ role: 'coach', teamIds: ['team-1'] }]), 'training_location:write')).toBe(false)
    expect(can(userWith([{ role: 'section-manager', sectionId: 'section-a' }]), 'training_location:write')).toBe(false)
  })

  it('denies every other non-admin role from writing training locations', () => {
    const roles: User['roles'] = [
      { role: 'player', teamId: 'team-1' },
      { role: 'authorized-officer' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'volunteer' },
    ]
    for (const role of roles) {
      expect(can(userWith([role]), 'training_location:write')).toBe(false)
    }
  })

  it('allows an admin+coach multi-role account to write training locations', () => {
    expect(can(userWith([{ role: 'coach', teamIds: ['team-1'] }, { role: 'admin' }]), 'training_location:write')).toBe(true)
  })
})

// specs/coach-match-composition.md §2/AC-MC-03/AC-02 — 'match_lineup:write' is
// team-scoped to the coach's own teams, coach only.
describe('can — match_lineup:write', () => {
  it('allows a coach on their own team', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'match_lineup:write', { teamId: 'team-1' })).toBe(true)
  })

  it('denies a coach on another team', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'match_lineup:write', { teamId: 'team-2' })).toBe(false)
  })

  it('denies a coach when no teamId is given', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'match_lineup:write')).toBe(false)
  })

  it('denies a player, even on their own team', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'match_lineup:write', { teamId: 'team-1' })).toBe(false)
  })

  it('denies a section-manager (PO-MC-10, not built)', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'match_lineup:write', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
  })

  // specs/web-create-convocation.md AC-WC-04 — the admin additions to the
  // matrix, and the one new permission.
  describe('admin convocation and attendance actions', () => {
    const admin = userWith([{ role: 'admin' }])

    it.each(['attendance:validate', 'convocation:update', 'match_details:update', 'meeting_details:update'] as const)(
      'allows an admin to %s on any team, club-wide',
      (action) => {
        expect(can(admin, action, { teamId: 'team-9', sectionId: 'section-9' })).toBe(true)
        expect(can(admin, action)).toBe(true)
      },
    )

    it('keeps meeting_details:update admin-only: a coach of the team is denied', () => {
      const coach = userWith([{ role: 'coach', teamIds: ['team-1'] }])
      expect(can(coach, 'meeting_details:update', { teamId: 'team-1' })).toBe(false)
    })

    it.each([
      { role: 'player', teamId: 'team-1' },
      { role: 'section-manager', sectionId: 'section-a' },
      { role: 'authorized-officer' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'volunteer' },
    ] as User['roles'])('denies %j meeting_details:update and attendance:validate', (role) => {
      const user = userWith([role])
      expect(can(user, 'meeting_details:update', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
      expect(can(user, 'attendance:validate', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
    })

    it('leaves the coach team scope intact on the widened actions', () => {
      const coach = userWith([{ role: 'coach', teamIds: ['team-1'] }])
      for (const action of ['attendance:validate', 'convocation:update', 'match_details:update'] as const) {
        expect(can(coach, action, { teamId: 'team-1' })).toBe(true)
        expect(can(coach, action, { teamId: 'team-2' })).toBe(false)
      }
    })

    it('only the admin passes backoffice:access, the guard the attendance use case relies on', () => {
      expect(can(admin, 'backoffice:access')).toBe(true)
      expect(can(userWith([{ role: 'coach', teamIds: ['team-1'] }]), 'backoffice:access')).toBe(false)
    })
  })

  // specs/player-unavailability.md §2, AC-02, AC-PU-09
  describe('availability actions', () => {
    const coach = userWith([{ role: 'coach', teamIds: ['team-1', 'team-3'] }])
    const player = userWith([{ role: 'player', teamId: 'team-1' }])

    it('allows a coach to declare and read-team for each of their teams', () => {
      for (const action of ['availability:declare', 'availability:read-team'] as const) {
        expect(can(coach, action, { teamId: 'team-1' })).toBe(true)
        expect(can(coach, action, { teamId: 'team-3' })).toBe(true)
      }
    })

    it('denies a coach for another team or without a teamId', () => {
      for (const action of ['availability:declare', 'availability:read-team'] as const) {
        expect(can(coach, action, { teamId: 'team-2' })).toBe(false)
        expect(can(coach, action)).toBe(false)
      }
    })

    it('allows a player to read-team for their own team only', () => {
      expect(can(player, 'availability:read-team', { teamId: 'team-1' })).toBe(true)
      expect(can(player, 'availability:read-team', { teamId: 'team-2' })).toBe(false)
      expect(can(player, 'availability:read-team')).toBe(false)
    })

    it('denies a player availability:declare, even for their own team', () => {
      expect(can(player, 'availability:declare', { teamId: 'team-1' })).toBe(false)
    })

    it.each([
      { role: 'section-manager', sectionId: 'section-a' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'volunteer' },
      { role: 'admin' },
    ] as User['roles'])('denies %j both availability actions', (role) => {
      const user = userWith([role])
      for (const action of ['availability:declare', 'availability:read-team'] as const) {
        expect(can(user, action, { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
      }
    })

    // Developer decision: the Dirigeant habilité reads any team's availability
    // (teammate projection), club-wide, but never declares one.
    it('allows an authorized-officer to read-team for any team, and denies declare', () => {
      const officer = userWith([{ role: 'authorized-officer' }])
      expect(can(officer, 'availability:read-team', { teamId: 'team-9' })).toBe(true)
      expect(can(officer, 'availability:read-team')).toBe(true)
      expect(can(officer, 'availability:declare', { teamId: 'team-9' })).toBe(false)
    })

    // Developer decision: the officer may declare/lift a SUSPENSION club-wide;
    // medical stays coach-only.
    it('allows an authorized-officer availability:declare-suspension for any team', () => {
      const officer = userWith([{ role: 'authorized-officer' }])
      expect(can(officer, 'availability:declare-suspension', { teamId: 'team-9' })).toBe(true)
      expect(can(officer, 'availability:declare-suspension')).toBe(true)
    })

    it('scopes availability:declare-suspension to the coach\'s own teams and denies a player', () => {
      expect(can(coach, 'availability:declare-suspension', { teamId: 'team-1' })).toBe(true)
      expect(can(coach, 'availability:declare-suspension', { teamId: 'team-2' })).toBe(false)
      expect(can(coach, 'availability:declare-suspension')).toBe(false)
      expect(can(player, 'availability:declare-suspension', { teamId: 'team-1' })).toBe(false)
    })

    it('grants a player-coach multi-role account declare via the coach assignment only', () => {
      const both = userWith([
        { role: 'player', teamId: 'team-2' },
        { role: 'coach', teamIds: ['team-1'] },
      ])
      expect(can(both, 'availability:declare', { teamId: 'team-1' })).toBe(true)
      expect(can(both, 'availability:declare', { teamId: 'team-2' })).toBe(false)
      expect(can(both, 'availability:read-team', { teamId: 'team-2' })).toBe(true)
    })
  })

  // specs/web-mission-templates.md §3/AC-MT-10 — 'mission-template:manage' is
  // ['admin']-only and club-wide.
  it('allows an admin to manage mission templates', () => {
    expect(can(userWith([{ role: 'admin' }]), 'mission-template:manage')).toBe(true)
  })

  it('denies every non-admin role from managing mission templates', () => {
    for (const role of [
      { role: 'coach', teamIds: ['team-1'] },
      { role: 'authorized-officer' },
      { role: 'volunteer' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'section-manager', sectionId: 'section-a' },
      { role: 'player', teamId: 'team-1' },
    ] as User['roles']) {
      expect(can(userWith([role]), 'mission-template:manage')).toBe(false)
    }
  })
})

// specs/match-details-missions.md §3/AC-MM-13 — exactly two actions.
describe('can — mission actions', () => {
  it('allows a player of the team to self-assign, denies a player of another team', () => {
    const user = userWith([{ role: 'player', teamId: 'team-1' }])
    expect(can(user, 'mission:self-assign', { teamId: 'team-1' })).toBe(true)
    expect(can(user, 'mission:self-assign', { teamId: 'team-2' })).toBe(false)
  })

  it('denies self-assign to coach, treasurer and volunteer', () => {
    for (const role of [
      { role: 'coach', teamIds: ['team-1'] },
      { role: 'treasurer' },
      { role: 'volunteer' },
    ] as User['roles']) {
      expect(can(userWith([role]), 'mission:self-assign', { teamId: 'team-1' })).toBe(false)
    }
  })

  it('allows a coach to manage missions of their team only', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }])
    expect(can(user, 'mission:manage', { teamId: 'team-1' })).toBe(true)
    expect(can(user, 'mission:manage', { teamId: 'team-2' })).toBe(false)
    expect(can(user, 'mission:manage')).toBe(false)
  })

  it('allows a section-manager to manage missions of their section only', () => {
    const user = userWith([{ role: 'section-manager', sectionId: 'section-a' }])
    expect(can(user, 'mission:manage', { teamId: 'team-1', sectionId: 'section-a' })).toBe(true)
    expect(can(user, 'mission:manage', { teamId: 'team-1', sectionId: 'section-b' })).toBe(false)
  })

  it('allows authorized-officer and admin to manage missions club-wide', () => {
    expect(can(userWith([{ role: 'authorized-officer' }]), 'mission:manage', { teamId: 'team-9' })).toBe(true)
    expect(can(userWith([{ role: 'admin' }]), 'mission:manage', { teamId: 'team-9' })).toBe(true)
  })

  it('denies mission:manage to player, treasurer, medical referent and volunteer', () => {
    for (const role of [
      { role: 'player', teamId: 'team-1' },
      { role: 'treasurer' },
      { role: 'medical-referent' },
      { role: 'volunteer' },
    ] as User['roles']) {
      expect(can(userWith([role]), 'mission:manage', { teamId: 'team-1' })).toBe(false)
    }
  })

  // 'convocation:create_retroactive' — admin only, club-wide, no scope check.
  it('allows an admin to create a retroactive convocation', () => {
    const user = userWith([{ role: 'admin' }])
    expect(can(user, 'convocation:create_retroactive')).toBe(true)
  })

  it('allows a multi-role account holding admin to create a retroactive convocation', () => {
    const user = userWith([{ role: 'coach', teamIds: ['team-1'] }, { role: 'admin' }])
    expect(can(user, 'convocation:create_retroactive')).toBe(true)
  })

  const NON_ADMIN_ASSIGNMENTS: Array<[string, User['roles'][number]]> = [
    ['coach', { role: 'coach', teamIds: ['team-1'] }],
    ['section-manager', { role: 'section-manager', sectionId: 'section-a' }],
    ['authorized-officer', { role: 'authorized-officer' }],
    ['player', { role: 'player', teamId: 'team-1' }],
    ['treasurer', { role: 'treasurer' }],
  ]
  it.each(NON_ADMIN_ASSIGNMENTS)('denies a %s from creating a retroactive convocation', (_label, assignment) => {
    const user = userWith([assignment])
    expect(can(user, 'convocation:create_retroactive', { teamId: 'team-1' })).toBe(false)
  })
})

// specs/mobile-treasurer.md §3 — read-only Cotisations access, club-wide.
describe('can — dues:read', () => {
  it.each([{ role: 'treasurer' }, { role: 'authorized-officer' }, { role: 'admin' }] as User['roles'])(
    'allows %j with no context',
    (role) => {
      expect(can(userWith([role]), 'dues:read')).toBe(true)
    },
  )

  it.each([
    { role: 'player', teamId: 'team-1' },
    { role: 'coach', teamIds: ['team-1'] },
    { role: 'section-manager', sectionId: 'section-a' },
    { role: 'medical-referent' },
    { role: 'volunteer' },
  ] as User['roles'])('denies %j', (role) => {
    expect(can(userWith([role]), 'dues:read', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
  })

  it('allows a multi-role account as soon as one role grants it', () => {
    expect(can(userWith([{ role: 'player', teamId: 'team-1' }, { role: 'treasurer' }]), 'dues:read')).toBe(true)
  })
})

// specs/mobile-treasurer.md §3 "Écriture" (PO-TR-01(a) accepted) — exactly
// admin and treasurer; mirrors the RLS insert policies on membership_payments.
describe('can — payment:record', () => {
  it.each([{ role: 'treasurer' }, { role: 'admin' }] as User['roles'])('allows %j with no context', (role) => {
    expect(can(userWith([role]), 'payment:record')).toBe(true)
  })

  it.each([
    { role: 'player', teamId: 'team-1' },
    { role: 'coach', teamIds: ['team-1'] },
    { role: 'section-manager', sectionId: 'section-a' },
    { role: 'authorized-officer' },
    { role: 'medical-referent' },
    { role: 'volunteer' },
  ] as User['roles'])('denies %j', (role) => {
    expect(can(userWith([role]), 'payment:record', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
  })

  it('allows a multi-role account as soon as one role grants it', () => {
    expect(can(userWith([{ role: 'player', teamId: 'team-1' }, { role: 'treasurer' }]), 'payment:record')).toBe(true)
  })

  it('does not widen membership:write to the treasurer', () => {
    expect(can(userWith([{ role: 'treasurer' }]), 'membership:write')).toBe(false)
  })
})

// specs/mobile-treasurer.md amendement (4), AC-TR-27 — exactly the treasurer:
// not admin (PO-TR-14), not authorized-officer (read-only). Mirrors the role
// check of send_dues_reminders().
describe('can — dues:remind', () => {
  it('allows a treasurer with no context', () => {
    expect(can(userWith([{ role: 'treasurer' }]), 'dues:remind')).toBe(true)
  })

  it.each([
    { role: 'admin' },
    { role: 'authorized-officer' },
    { role: 'player', teamId: 'team-1' },
    { role: 'coach', teamIds: ['team-1'] },
    { role: 'section-manager', sectionId: 'section-a' },
    { role: 'medical-referent' },
    { role: 'volunteer' },
  ] as User['roles'])('denies %j', (role) => {
    expect(can(userWith([role]), 'dues:remind', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
  })

  it('allows a multi-role account as soon as the treasurer role is carried', () => {
    expect(can(userWith([{ role: 'player', teamId: 'team-1' }, { role: 'treasurer' }]), 'dues:remind')).toBe(true)
  })

  it('does not widen dues:read or payment:record', () => {
    expect(can(userWith([{ role: 'authorized-officer' }]), 'dues:remind')).toBe(false)
    expect(can(userWith([{ role: 'authorized-officer' }]), 'dues:read')).toBe(true)
  })
})

// specs/mob-treasurer-finances.md §3 / AC-FI-04 — ADDITIONS to the matrix.
describe('can — finances:read', () => {
  it.each([{ role: 'treasurer' }, { role: 'authorized-officer' }, { role: 'admin' }] as User['roles'])(
    'allows %j with no context',
    (role) => {
      expect(can(userWith([role]), 'finances:read')).toBe(true)
    },
  )

  it.each([
    { role: 'player', teamId: 'team-1' },
    { role: 'coach', teamIds: ['team-1'] },
    { role: 'section-manager', sectionId: 'section-a' },
    { role: 'medical-referent' },
    { role: 'volunteer' },
  ] as User['roles'])('denies %j', (role) => {
    expect(can(userWith([role]), 'finances:read', { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
  })

  it('allows a multi-role account as soon as one role grants it', () => {
    expect(can(userWith([{ role: 'player', teamId: 'team-1' }, { role: 'authorized-officer' }]), 'finances:read')).toBe(true)
  })
})

describe.each(['expense:record', 'opening_balance:record', 'treasury_checkpoint:record'] as const)('can — %s', (action) => {
  it('allows a treasurer with no context', () => {
    expect(can(userWith([{ role: 'treasurer' }]), action)).toBe(true)
  })

  // The officer and the admin are READ-ONLY on Finances (AC-FI-03).
  it.each([
    { role: 'authorized-officer' },
    { role: 'admin' },
    { role: 'player', teamId: 'team-1' },
    { role: 'coach', teamIds: ['team-1'] },
    { role: 'section-manager', sectionId: 'section-a' },
    { role: 'medical-referent' },
    { role: 'volunteer' },
  ] as User['roles'])('denies %j', (role) => {
    expect(can(userWith([role]), action, { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
  })

  it('allows an officer who also carries the treasurer role (write controls shown)', () => {
    expect(can(userWith([{ role: 'authorized-officer' }, { role: 'treasurer' }]), action)).toBe(true)
  })
})

// specs/web-finance-carriers.md AC-FC-01 — admin only, club-wide.
describe.each(['finance_carrier:create', 'finance_carrier:update'] as const)('can — %s', (action) => {
  it('allows an admin with no context', () => {
    expect(can(userWith([{ role: 'admin' }]), action)).toBe(true)
  })

  it.each([
    { role: 'treasurer' },
    { role: 'authorized-officer' },
    { role: 'coach', teamIds: ['team-1'] },
    { role: 'player', teamId: 'team-1' },
    { role: 'section-manager', sectionId: 'section-a' },
    { role: 'medical-referent' },
    { role: 'volunteer' },
  ] as User['roles'])('denies %j', (role) => {
    expect(can(userWith([role]), action, { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
  })

  it('allows a treasurer who also carries the admin role', () => {
    expect(can(userWith([{ role: 'treasurer' }, { role: 'admin' }]), action)).toBe(true)
  })
})

// specs/mob-treasurer-finances-edit.md AC-FIE-01/15 — the seven correction
// actions are treasurer-only; officer and admin stay read-only.
describe.each([
  'expense:update',
  'expense:delete',
  'expense_category:update',
  'expense_category:delete',
  'opening_balance:update',
  'treasury_checkpoint:update',
  'treasury_checkpoint:delete',
] as const)('can — %s', (action) => {
  it('allows a treasurer with no context', () => {
    expect(can(userWith([{ role: 'treasurer' }]), action)).toBe(true)
  })

  it.each([
    { role: 'authorized-officer' },
    { role: 'admin' },
    { role: 'player', teamId: 'team-1' },
    { role: 'coach', teamIds: ['team-1'] },
    { role: 'section-manager', sectionId: 'section-a' },
    { role: 'medical-referent' },
    { role: 'volunteer' },
  ] as User['roles'])('denies %j', (role) => {
    expect(can(userWith([role]), action, { teamId: 'team-1', sectionId: 'section-a' })).toBe(false)
  })

  it('allows an officer who also carries the treasurer role', () => {
    expect(can(userWith([{ role: 'authorized-officer' }, { role: 'treasurer' }]), action)).toBe(true)
  })
})

// specs/finances-member-advances.md AC-FA-32 — treasurer only.
describe('can — expense_reimbursement:update', () => {
  it('allows a treasurer', () => {
    expect(can(userWith([{ role: 'treasurer' }]), 'expense_reimbursement:update')).toBe(true)
  })

  it.each([
    { role: 'authorized-officer' },
    { role: 'admin' },
    { role: 'coach', teamIds: ['team-1'] },
    { role: 'player', teamId: 'team-1' },
    { role: 'section-manager', sectionId: 'section-a' },
    { role: 'medical-referent' },
    { role: 'volunteer' },
  ] as User['roles'])('denies %j', (role) => {
    expect(can(userWith([role]), 'expense_reimbursement:update')).toBe(false)
  })
})

// specs/finances-member-advances.md AC-FA-13 — admin only.
describe('can — finance_carrier:archive', () => {
  it('allows an admin', () => {
    expect(can(userWith([{ role: 'admin' }]), 'finance_carrier:archive')).toBe(true)
  })

  it.each([
    { role: 'treasurer' },
    { role: 'authorized-officer' },
    { role: 'coach', teamIds: ['team-1'] },
    { role: 'player', teamId: 'team-1' },
    { role: 'section-manager', sectionId: 'section-a' },
    { role: 'medical-referent' },
    { role: 'volunteer' },
  ] as User['roles'])('denies %j', (role) => {
    expect(can(userWith([role]), 'finance_carrier:archive')).toBe(false)
  })
})
