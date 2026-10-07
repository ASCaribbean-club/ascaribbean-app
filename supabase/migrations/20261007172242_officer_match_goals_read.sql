-- Authorized officer reads the match result like a player: goal events of any
-- team (the score itself lives on match_details, already readable by the
-- officer). Cards and other staff-only event types stay hidden.
-- Mirrors rbac-matrix.ts 'match_goals:view' -> ['player', 'coach', 'authorized-officer'].
drop policy match_events_select_scoped on public.match_events;

create policy match_events_select_scoped on public.match_events
  for select to authenticated
  using (
    match_events.user_id = (select auth.uid())
    or exists (
      select 1 from public.convocations c
      where c.id = match_events.convocation_id
        and (
          (
            match_events.event_type = 'goal'
            and (private.is_team_member(c.team_id) or private.has_role('authorized-officer'))
          )
          or private.is_coach_of_team(c.team_id)
        )
    )
  );
