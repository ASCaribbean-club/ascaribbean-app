-- get_team_availability — adds the Dirigeant habilité (authorized-officer) as a
-- reader of ANY team's availability list, club-wide.
--
-- Mirrors domain/policies/rbac-matrix.ts 'availability:read-team' (now
-- ['player', 'coach', 'authorized-officer']). The officer gets the TEAMMATE
-- projection, the same as a player: 'medical' -> 'unavailable' with no dates;
-- a suspension keeps its status and dates. Only the coach of the team reads
-- medical detail (priority coach > officer/player), and only that view emits
-- the 'health_data.viewed' audit entry — unchanged. An officer who is also the
-- coach of the team keeps the coach view.
--
-- Same function as 20261001175044_player_unavailability.sql, with three lines
-- changed: v_is_officer, the authorization test, and this header.
--
-- NOT APPLIED by the agent that wrote it: to be reviewed and applied by the
-- developer. After applying, rename the file to the timestamp recorded
-- remotely.

create or replace function public.get_team_availability(p_team_id uuid)
returns table (
  user_id uuid,
  full_name text,
  status text,
  starts_on date,
  ends_on date
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_is_coach boolean := private.is_coach_of_team(p_team_id);
  v_is_player boolean := private.is_player_of_team(p_team_id);
  -- Dirigeant habilité: club-wide, any team, teammate projection only.
  v_is_officer boolean := private.has_role('authorized-officer');
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_medical_count integer;
begin
  if not (v_is_coach or v_is_player or v_is_officer) then
    return;
  end if;

  -- Audit de lecture santé (ARCHITECTURE.md §11, spec §3 point 3). Postgres n'a
  -- AUCUN trigger sur SELECT : l'émission vit donc DANS cette fonction
  -- SECURITY DEFINER (côté base, pas côté application) — elle trace toute
  -- lecture passant par l'API, mais PAS une lecture directe de la table brute
  -- (voir la note de fin de fichier). source = 'trigger' : c'est l'étiquette de
  -- « émetteur côté base » de audit_log.source ('usecase' est réservé à
  -- record_audit_log_entry). metadata = compte seulement, jamais de contenu
  -- médical ni d'identité. Seule la vue coach lit du médical ; la projection
  -- joueur ne contient pas de donnée de santé.
  if v_is_coach then
    select count(*) into v_medical_count
    from public.unavailabilities un
    join public.user_roles ur on ur.user_id = un.user_id and ur.team_id = p_team_id and ur.role = 'player'
    where un.kind = 'medical'
      and private.unavailability_is_active(un.kind, un.starts_on, un.expected_return_on, un.lifted_on, v_today);

    if v_medical_count > 0 then
      insert into public.audit_log (actor_id, action, target_id, target_type, metadata, source)
      values ((select auth.uid()), 'health_data.viewed', p_team_id, 'team',
              jsonb_build_object('medical_entries', v_medical_count), 'trigger');
    end if;
  end if;

  return query
  select
    r.id as user_id,
    r.full_name,
    case
      when m.id is not null then case when v_is_coach then 'medical' else 'unavailable' end
      when s.id is not null then 'suspended'
      else 'available'
    end as status,
    case
      when m.id is not null then case when v_is_coach then m.starts_on end
      when s.id is not null then s.starts_on
    end as starts_on,
    case
      when m.id is not null then case when v_is_coach then m.expected_return_on end
      when s.id is not null then s.lifted_on
    end as ends_on
  from (
    select u.id, u.full_name
    from public.user_roles ur
    join public.users u on u.id = ur.user_id
    where ur.team_id = p_team_id and ur.role = 'player'
  ) r
  left join lateral (
    select a.id, a.starts_on, a.expected_return_on
    from public.unavailabilities a
    where a.user_id = r.id and a.kind = 'medical'
      and private.unavailability_is_active(a.kind, a.starts_on, a.expected_return_on, a.lifted_on, v_today)
    order by a.starts_on desc
    limit 1
  ) m on true
  left join lateral (
    select a.id, a.starts_on, a.lifted_on
    from public.unavailabilities a
    where a.user_id = r.id and a.kind = 'suspension'
      and private.unavailability_is_active(a.kind, a.starts_on, a.expected_return_on, a.lifted_on, v_today)
    order by a.starts_on desc
    limit 1
  ) s on true
  order by lower(r.full_name);
end;
$$;

revoke all on function public.get_team_availability(uuid) from public;
grant execute on function public.get_team_availability(uuid) to authenticated;
