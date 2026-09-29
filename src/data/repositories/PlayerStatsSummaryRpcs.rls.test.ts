// specs/player-stats.md §6.3 point 2/AC-PS-18 — "Test d'intégration avec un
// jeton joueur : un SELECT brut sur attendance_records renvoie zéro ligne
// (AC-PS-18), et les deux RPC ne renvoient que les compteurs de l'appelant
// (AC-01/AC-02)."
//
// ⚠️ PO-MD-10 reste ouvert (§6.3 point 3 de la même spec, repeated verbatim
// from specs/edit-match-details.md/specs/coach-attendance-confirmation.md/
// specs/player-vote.md before it): even though
// src/data/repositories/rls-test-support.ts + ConvocationRespondersRepositoryImpl.rls.test.ts
// DO provide a working local-Supabase-stack harness (real signInWithPassword
// sessions, disposable test accounts), every spec written since that
// infrastructure landed (2026-09-04) has kept treating PO-MD-10 as open and
// its own RLS criteria as `it.todo` candidates — this file follows that same
// repeated, deliberate convention rather than silently diverging from it.
// Flagged to the developer, not resolved here (CLAUDE.md §7 — "don't resolve
// a point explicitly marked OPEN in a spec").
//
// Left as bodyless `it.todo` on purpose: filling these in needs the same
// fixture shape as ConvocationRespondersRepositoryImpl.rls.test.ts (a
// section/season/team/two players via the admin client, then a real
// signInAsTestUser() session per role) PLUS attendance_records/
// convocation_responses/match_events rows to assert against — substantial
// enough fixture work that it belongs in its own pass once PO-MD-10 is
// actually prioritized, not bolted on silently here. Run (once written) via
// `npm run test:rls`, never the default `npm test` (see vitest.config.ts's
// `rls` project, `*.rls.test.ts` is excluded from `domain-data`).
import { describe, it } from 'vitest'

describe('get_my_attendance_summary / get_my_response_summary / get_my_goals_count — RLS', () => {
  it.todo(
    'a player token running a direct SELECT against public.attendance_records returns zero rows — RLS is not widened by this feature (AC-PS-18/AC-PS-21)',
  )

  it.todo(
    'get_my_attendance_summary() returns only the CALLING player\'s own validated_count/present_count, never affected by another player\'s attendance_records rows (AC-01/AC-02)',
  )

  it.todo(
    'get_my_response_summary() returns only the CALLING player\'s own convocated_count/responded_count, never affected by a teammate\'s convocation_responses rows (AC-01/AC-02)',
  )

  it.todo(
    'get_my_goals_count() returns only the CALLING player\'s own goal count, never affected by a teammate\'s match_events rows (AC-01/AC-02)',
  )

  it.todo(
    'the response of get_my_attendance_summary() contains exactly validated_count/present_count — no note, absence_validity, validated_by, or row id (AC-PS-06), verified on the response SHAPE, not the rendered UI',
  )
})
