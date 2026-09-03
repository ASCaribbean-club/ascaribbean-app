-- Closes the leak left open by 20260901120018_convocation_responder_
-- visibility_correction.sql: that migration's own comment claimed the base
-- table's policy was "coach/admin, full row" and left it untouched on that
-- assumption (docs/convocation_visibility_rls_correction.md §2.1). In fact
-- `convocation_responses_select_team_scoped` used `is_team_member()`, which
-- covers BOTH 'player' and 'coach' roles — so any teammate could still
-- SELECT status/reason directly from convocation_responses, the exact leak
-- AC-MD-08 was raised to close. The new convocation_responders view/
-- get_convocation_responders RPC were never the actual boundary; this base
-- table policy was.
--
-- Fix: a responder can read their own row; a coach/admin of the team can
-- read the full roster's rows (needed for EffectifTab's coach tri-state
-- view, PO-MD-03). A regular teammate no longer gets full-row SELECT at
-- all — they only see status/reason for themselves, and booleans-only for
-- everyone else via convocation_responders (unaffected by this change,
-- since it stays security_invoker and re-checks the caller's own row
-- visibility, which self-row access still satisfies).
drop policy convocation_responses_select_team_scoped on public.convocation_responses;

create policy convocation_responses_select_own_or_coach on public.convocation_responses
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.convocations c
      where c.id = convocation_responses.convocation_id
        and (private.is_coach_of_team(c.team_id) or private.is_admin())
    )
  );
