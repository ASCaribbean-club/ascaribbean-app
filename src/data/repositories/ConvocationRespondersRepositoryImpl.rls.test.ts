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
// These five tests are deliberately `it.todo` rather than sketched-out fake
// assertions: writing even a partial body here would mean deciding the test
// infra question below on the developer's behalf, which is exactly the kind
// of call this agent isn't supposed to make silently.
//
// TODO (blocks writing any of the five bodies below): how does a Vitest test
// in this `node` project obtain a REAL, authenticated Supabase session for a
// player / coach / section-manager / authorized-officer token — as opposed
// to the anon key this project's client-side bundle uses? Nothing in this
// repo answers that yet:
//   - no `supabase/config.toml` (no local Supabase stack to seed/reset
//     against between test runs),
//   - no seeded test-account fixtures (scripts/create-user*.mjs exist for
//     provisioning real club members, not disposable test identities),
//   - `.env.example` only lists VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
//     (client-safe) and SUPABASE_SERVICE_ROLE_KEY (script-only, must never
//     reach these tests' assertions the way a player/coach token would).
// Whatever's decided, remember: signing in as a service_role key is NOT a
// substitute for a real player/coach/section-manager session — a
// service_role key bypasses RLS entirely, which is exactly the boundary
// these five tests exist to prove.
import { describe, it } from 'vitest'

describe('convocation_responders / get_convocation_responders / convocations_select_team_scoped — RLS', () => {
  // docs/convocation_visibility_rls_correction.md §5, test 1.
  it.todo(
    'a player token querying convocation_responders for their own team gets has_responded booleans only — status/reason absent from the response shape entirely, not merely unused (AC-MD-08)',
  )

  // §5, test 2 — now covers get_convocation_responders (single-RPC design,
  // see supabase/migrations/20260901120018_convocation_responder_visibility_
  // correction.sql part 2), not a separate get_convocation_responder_names.
  it.todo(
    'a player token calling get_convocation_responders gets user_id/display_name/has_responded for teammates on that convocation, and nothing for a convocation belonging to a different team — this is the regression test for the SECURITY DEFINER scoping check inside that RPC (own RLS bypassed by table-owner exemption, enforced instead by an explicit is_team_member/is_admin EXISTS check)',
  )

  // §5, test 3.
  it.todo(
    'a player token for a DIFFERENT team querying convocation_responders for a convocation not on their team gets an empty result (AC-01/AC-02, no existence leak)',
  )

  // §5, test 4 — regression test for ex-PO-MD-05 (AC-MD-16). Must fail
  // against the PRE-fix convocations_select_team_scoped policy to prove it's
  // testing the real thing, then pass once this migration's part 3 is
  // applied.
  it.todo(
    'a section-manager (or authorized-officer) token can immediately read back a convocation they just created within their scope, via convocations_select_team_scoped',
  )

  // §5, test 5 is a negative instruction, not a fifth assertion to write:
  // "Do not write a test that asserts a UI component hides a field." Nothing
  // to scaffold here beyond this comment — see the file-level note above.
})
