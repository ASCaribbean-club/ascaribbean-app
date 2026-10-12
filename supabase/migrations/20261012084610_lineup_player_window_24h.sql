-- 'match_lineup:read-window' — players now see the lineup from kickoff minus
-- 24 hours (was: the RDV time, or kickoff minus 1 hour). Mirrors, MANUALLY,
-- domain/policies/match-lineup-rules.ts getLineupOpeningTime /
-- isLineupVisibleToPlayer. Coaches: always (unchanged). Same strict
-- comparison, server clock.

create or replace function private.can_read_match_lineup(p_convocation_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.is_football_match(p_convocation_id)
    and exists (
      select 1
      from public.convocations c
      where c.id = p_convocation_id
        and (
          private.is_coach_of_team(c.team_id)
          or (
            private.is_player_of_team(c.team_id)
            and now() > c.date - interval '24 hours'
          )
        )
    );
$$;
