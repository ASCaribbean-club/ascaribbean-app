// Integration tests against the database (specs/convocation-player-selection.md
// AC-02, AC-CPS-03..06, AC-CPS-11..13, AC-CPS-16). Same conventions as
// ConvocationRespondersRepositoryImpl.rls.test.ts: LOCAL Supabase stack only
// (`npm run test:rls`), real per-role sessions, service_role used for
// fixtures only — never for the assertions.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assignRole, createAdminClient, createTestUser, getLocalSupabaseEnv, signInAsTestUser } from './rls-test-support'

const PASSWORD = 'rls-test-password-not-a-real-account'
const FUTURE = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

describe('convocation_attendees / create_*_convocation / competition_type — RLS and triggers', () => {
  const env = getLocalSupabaseEnv()
  const admin = createAdminClient(env)

  let teamAId: string
  let teamBId: string
  let opponentId: string
  let coachA: { id: string; client: SupabaseClient }
  let coachB: { id: string; client: SupabaseClient }
  const playerIds: string[] = []
  let outsiderId: string
  const playerClients: SupabaseClient[] = []
  let notConvokedClient: SupabaseClient
  let notConvokedId: string

  async function createMatch(client: SupabaseClient, createdBy: string, competitionType: string | null, attendeeIds: string[]) {
    return client
      .rpc('create_match_convocation', {
        p_team_id: teamAId,
        p_created_by: createdBy,
        p_date: FUTURE(),
        p_location: 'Stade RLS',
        p_opponent_id: opponentId,
        p_is_home: true,
        p_meeting_point_time: null,
        p_meeting_point_location: null,
        p_competition_type: competitionType,
        p_attendee_ids: attendeeIds,
      })
      .single<{ id: string }>()
  }

  beforeAll(async () => {
    const { data: section, error: sectionError } = await admin.from('sections').insert({ name: 'RLS attendees section', type: 'football' }).select('id').single()
    if (sectionError) throw sectionError
    const seasonYear = 2200 + Math.floor(Math.random() * 5000)
    const { data: season, error: seasonError } = await admin
      .from('seasons')
      .insert({ label: 'RLS attendees season', start_date: `${seasonYear}-01-01`, end_date: `${seasonYear}-12-31` })
      .select('id')
      .single()
    if (seasonError) throw seasonError
    const { data: teamA } = await admin.from('teams').insert({ name: 'RLS attendees A', section_id: section.id, season_id: season.id }).select('id').single()
    const { data: teamB } = await admin.from('teams').insert({ name: 'RLS attendees B', section_id: section.id, season_id: season.id }).select('id').single()
    teamAId = teamA!.id
    teamBId = teamB!.id
    const { data: opponent } = await admin.from('opponents').insert({ name: 'RLS opponent' }).select('id').single()
    opponentId = opponent!.id

    const coachAUser = await createTestUser(admin, { emailPrefix: 'coach-a', password: PASSWORD, fullName: 'Coach A' })
    const coachBUser = await createTestUser(admin, { emailPrefix: 'coach-b', password: PASSWORD, fullName: 'Coach B' })
    await assignRole(admin, coachAUser.id, 'coach', { teamId: teamAId })
    await assignRole(admin, coachBUser.id, 'coach', { teamId: teamBId })
    coachA = { id: coachAUser.id, client: await signInAsTestUser(env, coachAUser.email, PASSWORD) }
    coachB = { id: coachBUser.id, client: await signInAsTestUser(env, coachBUser.email, PASSWORD) }

    // 16 players on team A: enough to cross the cap of 14 in both directions.
    for (let index = 0; index < 16; index += 1) {
      const player = await createTestUser(admin, { emailPrefix: `player-${index}`, password: PASSWORD, fullName: `Player ${index}` })
      await assignRole(admin, player.id, 'player', { teamId: teamAId })
      playerIds.push(player.id)
      if (index === 0) playerClients.push(await signInAsTestUser(env, player.email, PASSWORD))
    }
    const notConvoked = await createTestUser(admin, { emailPrefix: 'player-nc', password: PASSWORD, fullName: 'Player NC' })
    await assignRole(admin, notConvoked.id, 'player', { teamId: teamAId })
    notConvokedId = notConvoked.id
    notConvokedClient = await signInAsTestUser(env, notConvoked.email, PASSWORD)
    const outsider = await createTestUser(admin, { emailPrefix: 'outsider', password: PASSWORD, fullName: 'Outsider' })
    await assignRole(admin, outsider.id, 'player', { teamId: teamBId })
    outsiderId = outsider.id
  }, 90000)

  afterAll(async () => {
    await coachA?.client.auth.signOut()
    await coachB?.client.auth.signOut()
  })

  it('AC-CPS-05: a match without competition type, or with an unknown one, is refused by the database', async () => {
    const missing = await createMatch(coachA.client, coachA.id, null, playerIds.slice(0, 3))
    expect(missing.error).not.toBeNull()
    const unknown = await createMatch(coachA.client, coachA.id, 'league', playerIds.slice(0, 3))
    expect(unknown.error).not.toBeNull()
  })

  it('AC-CPS-03/AC-CPS-06: creates exactly the listed players; 14 passes, 15 is refused and nothing is written', async () => {
    const ok = await createMatch(coachA.client, coachA.id, 'official', playerIds.slice(0, 14))
    expect(ok.error).toBeNull()
    const { data: rows } = await admin.from('convocation_attendees').select('user_id').eq('convocation_id', ok.data!.id)
    expect((rows ?? []).map((row) => row.user_id).sort()).toEqual(playerIds.slice(0, 14).sort())

    const { count: before } = await admin.from('convocations').select('id', { count: 'exact', head: true }).eq('team_id', teamAId)
    const tooMany = await createMatch(coachA.client, coachA.id, 'official', playerIds.slice(0, 15))
    expect(tooMany.error).not.toBeNull()
    const { count: after } = await admin.from('convocations').select('id', { count: 'exact', head: true }).eq('team_id', teamAId)
    expect(after).toBe(before)
  })

  it('AC-CPS-07: a friendly match accepts more than 14', async () => {
    const result = await createMatch(coachA.client, coachA.id, 'friendly', playerIds)
    expect(result.error).toBeNull()
  })

  it('AC-CPS-04: a coach or a player of another team cannot be convoked', async () => {
    const coachInList = await createMatch(coachA.client, coachA.id, 'friendly', [playerIds[0], coachA.id])
    expect(coachInList.error).not.toBeNull()
    const outsiderInList = await createMatch(coachA.client, coachA.id, 'friendly', [playerIds[0], outsiderId])
    expect(outsiderInList.error).not.toBeNull()
  })

  it('AC-CPS-11/AC-02: only the coach of the team can add a convoked player; a player token or a coach of another team is refused', async () => {
    const created = await createMatch(coachA.client, coachA.id, 'friendly', playerIds.slice(0, 3))
    const convocationId = created.data!.id
    const row = { convocation_id: convocationId, user_id: playerIds[5] }

    expect((await playerClients[0].from('convocation_attendees').insert(row)).error).not.toBeNull()
    expect((await coachB.client.from('convocation_attendees').insert(row)).error).not.toBeNull()
    expect((await coachA.client.from('convocation_attendees').insert(row)).error).toBeNull()
  })

  it('AC-CPS-06: an addition on an official match at 14 is refused', async () => {
    const created = await createMatch(coachA.client, coachA.id, 'official', playerIds.slice(0, 14))
    const { error } = await coachA.client.from('convocation_attendees').insert({ convocation_id: created.data!.id, user_id: playerIds[14] })
    expect(error).not.toBeNull()
  })

  it('AC-CPS-16 (hypothesis PO-CPS-03): a player who is not convoked cannot write a response', async () => {
    const created = await createMatch(coachA.client, coachA.id, 'friendly', playerIds.slice(0, 3))
    const { error } = await notConvokedClient
      .from('convocation_responses')
      .insert({ convocation_id: created.data!.id, user_id: notConvokedId, status: 'present', responded_at: new Date().toISOString() })
    expect(error).not.toBeNull()
  })

  it('AC-CPS-13: a player who is not on the list cannot be placed in the lineup', async () => {
    const created = await createMatch(coachA.client, coachA.id, 'friendly', playerIds.slice(0, 3))
    const { error } = await coachA.client.rpc('save_match_lineup', {
      p_convocation_id: created.data!.id,
      p_formation: '4-4-2',
      p_slots: [{ slot_index: 0, user_id: notConvokedId }],
    })
    expect(error).not.toBeNull()
  })

  it('AC-01: a player of another team reads nothing of the list', async () => {
    const created = await createMatch(coachA.client, coachA.id, 'friendly', playerIds.slice(0, 3))
    const { data } = await coachB.client.from('convocation_attendees').select('user_id').eq('convocation_id', created.data!.id)
    expect(data).toEqual([])
  })
})
