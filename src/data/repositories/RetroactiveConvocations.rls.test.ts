// Retroactive convocations — specs/create-convocation.md, addendum "Retroactive
// convocations and creation window" (D1/D3/D4).
//
// Left as bodyless `it.todo` on purpose, following the convention of
// PlayerStatsSummaryRpcs.rls.test.ts: PO-MD-10 (RLS/integration criteria) is
// still OPEN in the specs, and these need the full fixture shape of
// ConvocationRespondersRepositoryImpl.rls.test.ts (section/season/team,
// players, response + attendance rows, one real session per role). Run (once
// written) via `npm run test:rls`, never the default `npm test`.
//
// Fixture note for whoever fills these in: created_at is forced to now() by
// trigger even for the service role, so a NON-retroactive PAST convocation
// cannot be seeded directly — create it with a kickoff a few seconds ahead and
// wait, or disable the trigger in the fixture's SQL.
import { describe, it } from 'vitest'

describe('retroactive convocations — RLS and leaderboard', () => {
  it.todo(
    'get_team_presence_leaderboard excludes a retroactive convocation (created_at >= date) from convoked_count/responded_count but still counts its attendance_records in validated_count/present_count',
  )

  it.todo('a non-admin (coach) INSERT into convocations with date <= now() is rejected by convocations_insert_create')

  it.todo('an admin INSERT into convocations with date <= now() is accepted')

  it.todo('created_at is server-set on insert: a client-supplied value is ignored')

  it.todo('created_at is immutable on update: a client UPDATE cannot change it')
})
