-- Indisponibilité « avec raison » (kind = 'absence') : vacances, travail, etc.
-- Date de début obligatoire, date de retour optionnelle (borne EXCLUSIVE, comme
-- expected_return_on d'un `medical`), raison OBLIGATOIRE et visible des
-- coéquipiers. Ce n'est PAS une donnée de santé : une raison de santé se
-- déclare en `medical`, qui n'a volontairement aucun texte libre (RGPD art. 9).
--
-- Miroirs MANUELS (jamais générés, CLAUDE.md §7) — chaque côté nomme l'autre :
--   - domain/entities/unavailability.ts AbsenceUnavailability  <-> kind 'absence' + shape check
--   - domain/policies/availability.ts
--       isUnavailabilityActiveOn ('absence')                   <-> private.unavailability_is_active
--       getAvailabilityStatus (medical > suspension > absence) <-> CASE de get_team_availability
--       canWriteUnavailability ('absence' comme la suspension) <-> policies *_officer_non_medical
--   - GetConvocationAvailabilityUseCase (p_on = jour de la convocation) <-> get_team_availability(p_team_id, p_on)
--
-- NOT APPLIED by the agent that wrote it: to be reviewed and applied by the
-- developer. After applying, rename the file to the timestamp recorded remotely.

-- =========================================================================
-- 1. Table : nouveau kind + forme
-- Réutilise expected_return_on (« retour le », exclusif) et reason ; pas de
-- nouvelle colonne.
-- =========================================================================

alter table public.unavailabilities drop constraint unavailabilities_kind_check;
alter table public.unavailabilities
  add constraint unavailabilities_kind_check check (kind in ('medical', 'suspension', 'absence'));

alter table public.unavailabilities drop constraint unavailabilities_kind_shape_check;
alter table public.unavailabilities
  add constraint unavailabilities_kind_shape_check check (
    (kind = 'medical' and match_count is null and reason is null and lifted_on is null)
    or (kind = 'suspension' and match_count is not null and expected_return_on is null)
    or (kind = 'absence' and match_count is null and lifted_on is null and reason is not null and btrim(reason) <> '')
  );

-- =========================================================================
-- 2. Miroir de isUnavailabilityActiveOn : l'absence se comporte comme le médical
-- (début inclusif, retour exclusif, null = sans fin).
-- =========================================================================

create or replace function private.unavailability_is_active(
  p_kind text,
  p_starts_on date,
  p_expected_return_on date,
  p_lifted_on date,
  p_today date
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_starts_on <= p_today
    and case p_kind
      when 'medical' then p_expected_return_on is null or p_today < p_expected_return_on
      when 'absence' then p_expected_return_on is null or p_today < p_expected_return_on
      when 'suspension' then p_lifted_on is null or p_today < p_lifted_on
      else false
    end;
$$;

-- =========================================================================
-- 3. RLS — le Dirigeant habilité déclare/lève une absence comme une suspension
-- (aucune des deux n'est une donnée de santé). Le médical reste réservé au
-- coach. Les policies coach (is_coach_of_player) ne filtrent pas le kind : elles
-- couvrent déjà 'absence'.
-- rbac: 'availability:declare-suspension' (étendu à l'absence côté domaine :
-- canWriteUnavailability).
-- =========================================================================

drop policy unavailabilities_select_officer_suspension on public.unavailabilities;
drop policy unavailabilities_insert_officer_suspension on public.unavailabilities;
drop policy unavailabilities_update_officer_suspension on public.unavailabilities;

create policy unavailabilities_select_officer_non_medical on public.unavailabilities
  for select to authenticated
  using (kind in ('suspension', 'absence') and private.has_role('authorized-officer'));

create policy unavailabilities_insert_officer_non_medical on public.unavailabilities
  for insert to authenticated
  with check (
    kind in ('suspension', 'absence')
    and declared_by = (select auth.uid())
    and private.has_role('authorized-officer')
    and exists (
      select 1 from public.user_roles player
      where player.user_id = unavailabilities.user_id and player.role = 'player'
    )
  );

create policy unavailabilities_update_officer_non_medical on public.unavailabilities
  for update to authenticated
  using (kind in ('suspension', 'absence') and private.has_role('authorized-officer'))
  with check (kind in ('suspension', 'absence') and private.has_role('authorized-officer'));

-- =========================================================================
-- 4. get_team_availability — statut 'absent' + raison + jour évalué.
--
-- Signature changée (nouvelle colonne `reason`, nouveau paramètre `p_on`) :
-- l'ancienne fonction est supprimée puis recréée. `p_on` = jour pour lequel le
-- statut est évalué (le jour d'une convocation : une absence qui commence la
-- semaine prochaine ne bloque pas un match d'aujourd'hui, et inversement) ;
-- null = aujourd'hui (Europe/Paris). Les appelants existants (p_team_id seul)
-- continuent de fonctionner grâce au défaut.
--
-- Vue coach ET vue joueur/Dirigeant : 'absent' + dates + raison (pas une donnée
-- de santé). Le médical garde sa projection : 'medical' (coach) /
-- 'unavailable' sans date (joueur, Dirigeant). Priorité PROVISOIRE :
-- medical > suspension > absence (domain getAvailabilityStatus).
-- Le reste de la fonction est celui de 20261003150000_availability_read_officer.sql.
-- =========================================================================

drop function public.get_team_availability(uuid);

create function public.get_team_availability(p_team_id uuid, p_on date default null)
returns table (
  user_id uuid,
  full_name text,
  status text,
  starts_on date,
  ends_on date,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_is_coach boolean := private.is_coach_of_team(p_team_id);
  v_is_player boolean := private.is_player_of_team(p_team_id);
  v_is_officer boolean := private.has_role('authorized-officer');
  v_today date := coalesce(p_on, (now() at time zone 'Europe/Paris')::date);
  v_medical_count integer;
begin
  if not (v_is_coach or v_is_player or v_is_officer) then
    return;
  end if;

  -- Audit de lecture santé (inchangé) : seule la vue coach lit du médical.
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
      when a.id is not null then 'absent'
      else 'available'
    end as status,
    case
      when m.id is not null then case when v_is_coach then m.starts_on end
      when s.id is not null then s.starts_on
      when a.id is not null then a.starts_on
    end as starts_on,
    case
      when m.id is not null then case when v_is_coach then m.expected_return_on end
      when s.id is not null then s.lifted_on
      when a.id is not null then a.expected_return_on
    end as ends_on,
    -- La raison n'est renvoyée que pour une absence qui est le statut retenu.
    case when m.id is null and s.id is null then a.reason end as reason
  from (
    select u.id, u.full_name
    from public.user_roles ur
    join public.users u on u.id = ur.user_id
    where ur.team_id = p_team_id and ur.role = 'player'
  ) r
  left join lateral (
    select x.id, x.starts_on, x.expected_return_on
    from public.unavailabilities x
    where x.user_id = r.id and x.kind = 'medical'
      and private.unavailability_is_active(x.kind, x.starts_on, x.expected_return_on, x.lifted_on, v_today)
    order by x.starts_on desc
    limit 1
  ) m on true
  left join lateral (
    select x.id, x.starts_on, x.lifted_on
    from public.unavailabilities x
    where x.user_id = r.id and x.kind = 'suspension'
      and private.unavailability_is_active(x.kind, x.starts_on, x.expected_return_on, x.lifted_on, v_today)
    order by x.starts_on desc
    limit 1
  ) s on true
  left join lateral (
    select x.id, x.starts_on, x.expected_return_on, x.reason
    from public.unavailabilities x
    where x.user_id = r.id and x.kind = 'absence'
      and private.unavailability_is_active(x.kind, x.starts_on, x.expected_return_on, x.lifted_on, v_today)
    order by x.starts_on desc
    limit 1
  ) a on true
  order by lower(r.full_name);
end;
$$;

revoke all on function public.get_team_availability(uuid, date) from public;
grant execute on function public.get_team_availability(uuid, date) to authenticated;
