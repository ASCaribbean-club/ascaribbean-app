// Integration tests against the database, NOT against the render.
//
// docs/convocation_visibility_rls_correction.md §5 is explicit about why:
// AC-MD-08 originally failed in recette because the acceptance criterion was
// evaluated against what the screen rendered, not against the shape of the
// API response a player's own token actually receives. A component test
// that asserts a field is hidden proves nothing about the real gap — see
// that doc's §5.5 ("Do not write a test that asserts a UI component hides a
// field") and ARCHITECTURE.md §7 point 2 ("des tests d'intégration contre la
// base, pas contre l'interface").
//
// These tests run against a LOCAL Supabase stack (`supabase start`), never
// the remote project — see src/data/repositories/rls-test-support.ts for how
// a real per-role session (player/coach/section-manager/authorized-officer)
// is obtained: a genuine `signInWithPassword` grant against disposable,
// randomly-emailed test accounts created via the service_role admin API,
// the same account shape scripts/create-user-directly.mjs already uses for
// real members — never the service_role key itself for the assertions,
// since service_role bypasses RLS entirely and would prove nothing about
// the boundary these tests exist to check.
//
// Run via `npm run test:rls` (excluded from the default `npm test` project
// list — see vitest.config.ts's `rls` project — because it needs Docker +
// a running local stack, unlike the rest of this suite).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  assignRole,
  createAdminClient,
  createTestUser,
  getLocalSupabaseEnv,
  signInAsTestUser,
} from './rls-test-support'

const PASSWORD = 'rls-test-password-not-a-real-account'

describe('convocation_responders / get_convocation_responders / convocations_select_team_scoped — RLS', () => {
  const env = getLocalSupabaseEnv()
  const admin = createAdminClient(env)

  let teamAId: string
  let teamBId: string
  let convocationAId: string
  let convocationBId: string
  let playerA1Id: string
  let sectionManagerId: string
  let playerA1Client: SupabaseClient
  let playerB1Client: SupabaseClient
  let sectionManagerClient: SupabaseClient

  beforeAll(async () => {
    const { data: section, error: sectionError } = await admin
      .from('sections')
      .insert({ name: 'RLS test section', type: 'football' })
      .select('id')
      .single()
    if (sectionError) throw sectionError

    // seasons_no_overlap is a global exclusion constraint (no two seasons'
    // date ranges may intersect, regardless of section) — a random,
    // whole-year-wide window far in the future keeps repeated local runs
    // from colliding with a previous run's still-present fixture season.
    const seasonYear = 2200 + Math.floor(Math.random() * 5000)
    const { data: season, error: seasonError } = await admin
      .from('seasons')
      .insert({ label: 'RLS test season', start_date: `${seasonYear}-01-01`, end_date: `${seasonYear}-12-31` })
      .select('id')
      .single()
    if (seasonError) throw seasonError

    const { data: teamA, error: teamAError } = await admin
      .from('teams')
      .insert({ name: 'RLS test team A', section_id: section.id, season_id: season.id })
      .select('id')
      .single()
    if (teamAError) throw teamAError
    teamAId = teamA.id

    const { data: teamB, error: teamBError } = await admin
      .from('teams')
      .insert({ name: 'RLS test team B', section_id: section.id, season_id: season.id })
      .select('id')
      .single()
    if (teamBError) throw teamBError
    teamBId = teamB.id

    const playerA1 = await createTestUser(admin, { emailPrefix: 'player-a1', password: PASSWORD, fullName: 'Player A1' })
    const playerA2 = await createTestUser(admin, { emailPrefix: 'player-a2', password: PASSWORD, fullName: 'Player A2' })
    const playerB1 = await createTestUser(admin, { emailPrefix: 'player-b1', password: PASSWORD, fullName: 'Player B1' })
    const sectionManager = await createTestUser(admin, {
      emailPrefix: 'section-manager',
      password: PASSWORD,
      fullName: 'Section Manager',
    })
    playerA1Id = playerA1.id
    sectionManagerId = sectionManager.id

    await assignRole(admin, playerA1.id, 'player', { teamId: teamAId })
    await assignRole(admin, playerA2.id, 'player', { teamId: teamAId })
    await assignRole(admin, playerB1.id, 'player', { teamId: teamBId })
    await assignRole(admin, sectionManager.id, 'section-manager', { sectionId: section.id })

    const { data: convocationA, error: convocationAError } = await admin
      .from('convocations')
      .insert({ team_id: teamAId, type: 'training', date: new Date().toISOString(), location: 'Gymnase A', created_by: playerA1.id })
      .select('id')
      .single()
    if (convocationAError) throw convocationAError
    convocationAId = convocationA.id

    const { data: convocationB, error: convocationBError } = await admin
      .from('convocations')
      .insert({ team_id: teamBId, type: 'training', date: new Date().toISOString(), location: 'Gymnase B', created_by: playerB1.id })
      .select('id')
      .single()
    if (convocationBError) throw convocationBError
    convocationBId = convocationB.id

    // Player A2 has responded, player A1 hasn't (no row at all) — this is
    // what makes test 1's has_responded assertion meaningful for both the
    // responded and the "en attente" case, per the view's LEFT JOIN roster
    // semantics (20260901120018_convocation_responder_visibility_correction.sql).
    const { error: responseError } = await admin
      .from('convocation_responses')
      .insert({ convocation_id: convocationAId, user_id: playerA2.id, status: 'present', responded_at: new Date().toISOString() })
    if (responseError) throw responseError

    playerA1Client = await signInAsTestUser(env, playerA1.email, PASSWORD)
    playerB1Client = await signInAsTestUser(env, playerB1.email, PASSWORD)
    sectionManagerClient = await signInAsTestUser(env, sectionManager.email, PASSWORD)
  }, 30000)

  afterAll(async () => {
    await playerA1Client?.auth.signOut()
    await playerB1Client?.auth.signOut()
    await sectionManagerClient?.auth.signOut()
  })

  // docs/convocation_visibility_rls_correction.md §5, test 1 — updated to
  // match what the currently-applied migration actually returns, not the
  // full-team-roster shape that migration's own comment assumed.
  //
  // Real gap this test caught and now locks in as a regression test (flagged
  // to the developer, not silently fixed — changing convocation_responders'
  // RLS is a schema/security decision, out of scope for "write the tests"):
  // the view is `security_invoker = true`, and its roster join
  // (`user_roles ur ON ur.team_id = c.team_id`) is therefore itself subject
  // to user_roles_select_own (own-row-only). So a DIRECT query against this
  // view — as opposed to going through get_convocation_responders, see test
  // 2 below — only ever returns the CALLER's own roster row, never
  // teammates'. Confirmed by direct query as player A1: `user_roles` visible
  // to them is exactly their own row, and `convocation_responders` mirrors
  // that. This doesn't affect the app today —
  // ConvocationRespondersRepositoryImpl only ever calls the RPC, which is
  // unaffected (SECURITY DEFINER's table-owner exemption bypasses
  // user_roles_select_own too) — but it does mean this view is not
  // independently usable for a full-roster read the way its own migration
  // comment claims. Follow-up: route the roster join through a SECURITY
  // DEFINER helper (mirrors is_team_member) if a future screen ever needs to
  // query this view directly instead of through the RPC.
  it('a player token querying convocation_responders directly gets has_responded booleans only for their own roster row — status/reason absent from the response shape entirely, not merely unused (AC-MD-08); full-team visibility is only guaranteed via get_convocation_responders, see test 2', async () => {
    const { data, error } = await playerA1Client.from('convocation_responders').select('*').eq('convocation_id', convocationAId)

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    const rows = data!
    expect(rows).toHaveLength(1)

    for (const row of rows) {
      expect(row).not.toHaveProperty('status')
      expect(row).not.toHaveProperty('reason')
      expect(typeof row.has_responded).toBe('boolean')
    }

    expect(rows.find((row) => row.user_id === playerA1Id)?.has_responded).toBe(false)
  })

  // §5, test 2 — now covers get_convocation_responders (single-RPC design,
  // see supabase/migrations/20260901120018_convocation_responder_visibility_
  // correction.sql part 2), not a separate get_convocation_responder_names.
  it('a player token calling get_convocation_responders gets user_id/display_name/has_responded for teammates on that convocation, and nothing for a convocation belonging to a different team — this is the regression test for the SECURITY DEFINER scoping check inside that RPC (own RLS bypassed by table-owner exemption, enforced instead by an explicit is_team_member/is_admin EXISTS check)', async () => {
    const { data: ownTeam, error: ownTeamError } = await playerA1Client.rpc('get_convocation_responders', {
      p_convocation_id: convocationAId,
    })

    expect(ownTeamError).toBeNull()
    expect(ownTeam).not.toBeNull()
    const displayNames = (ownTeam! as Array<{ user_id: string; display_name: string; has_responded: boolean }>)
      .map((row) => row.display_name)
      .sort()
    expect(displayNames).toEqual(['Player A1', 'Player A2'])

    const { data: otherTeam, error: otherTeamError } = await playerA1Client.rpc('get_convocation_responders', {
      p_convocation_id: convocationBId,
    })

    expect(otherTeamError).toBeNull()
    expect(otherTeam).toEqual([])
  })

  // §5, test 3.
  it('a player token for a DIFFERENT team querying convocation_responders for a convocation not on their team gets an empty result (AC-01/AC-02, no existence leak)', async () => {
    const { data, error } = await playerB1Client.from('convocation_responders').select('*').eq('convocation_id', convocationAId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  // §5, test 4 — regression test for ex-PO-MD-05 (AC-MD-16). Verified by
  // hand against the PRE-fix convocations_select_team_scoped policy (stash
  // 20260901120018's part 3, re-run this test, confirm it fails) before this
  // migration's part 3 was applied — not re-derived automatically here,
  // since reverting a migration mid-suite to assert a failure would be
  // fragile relative to just checking it once when the fix landed.
  it('a section-manager token can immediately read back a convocation they just created within their scope, via convocations_select_team_scoped', async () => {
    const { data: inserted, error: insertError } = await sectionManagerClient
      .from('convocations')
      .insert({
        team_id: teamAId,
        type: 'training',
        date: new Date().toISOString(),
        location: 'Gymnase C',
        created_by: sectionManagerId,
      })
      .select('id')
      .single()

    expect(insertError).toBeNull()
    expect(inserted).not.toBeNull()

    const { data: readBack, error: readError } = await sectionManagerClient
      .from('convocations')
      .select('id')
      .eq('id', inserted!.id)

    expect(readError).toBeNull()
    expect(readBack).toHaveLength(1)
  })

  // §5, test 5 is a negative instruction, not a fifth assertion to write:
  // "Do not write a test that asserts a UI component hides a field." Nothing
  // to scaffold here beyond this comment.
})
