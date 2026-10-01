-- specs/player-unavailability.md (§1, §2, §3) — passe migration.
-- Crée la table `unavailabilities` (indisponibilité médicale / suspension),
-- sa RLS, la RPC de lecture d'équipe `get_team_availability`, et l'émission
-- d'audit sur lecture médicale (ARCHITECTURE.md §11).
--
-- Miroirs MANUELS (jamais générés, CLAUDE.md §7) — chaque côté nomme l'autre :
--   - domain/entities/unavailability.ts            <-> colonnes de la table
--   - domain/policies/availability.ts
--       isUnavailabilityActive                     <-> private.unavailability_is_active
--       getAvailabilityStatus (medical l'emporte)  <-> CASE de get_team_availability
--       toTeammateStatus (medical -> unavailable)  <-> branche « joueur » de get_team_availability
--   - rbac-matrix.ts 'availability:read-team'      <-> get_team_availability + unavailabilities_select_own_or_coach
--   - rbac-matrix.ts 'availability:declare'        <-> unavailabilities_insert_coach / unavailabilities_update_coach

-- =========================================================================
-- 1. public.unavailabilities
-- Aucune colonne texte libre sur `medical` (RGPD art. 9) : `reason` n'existe
-- que pour `suspension`, et un CHECK l'impose. Aucun `team_id` (PO-PU-03) :
-- le rattachement à l'équipe passe par user_roles.
-- Aucune règle de validité de plage (PO-PU-08 ouvert) : volontairement pas de
-- CHECK sur expected_return_on > starts_on, ni sur match_count.
-- =========================================================================

create table public.unavailabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('medical', 'suspension')),
  starts_on date not null,
  -- Le coach qui a déclaré. Pas de cascade : supprimer un coach ne doit pas
  -- emporter les déclarations qu'il a faites.
  declared_by uuid not null references public.users (id),
  declared_at timestamptz not null default now(),
  -- medical uniquement. null = durée indéterminée. Borne de fin EXCLUSIVE.
  expected_return_on date,
  -- suspension uniquement. matchCount informatif (PO-PU-04), reason libre.
  match_count integer,
  reason text,
  -- suspension uniquement. Levée manuelle, null = toujours active. Exclusive.
  lifted_on date,
  -- RETENTION_PURGE.md §5 : marquage posé à la création. Valeur NON définie
  -- ici (durée de rétention santé à valider avec le référent RGPD, §6) : nullable.
  expires_at timestamptz,
  constraint unavailabilities_kind_shape_check check (
    (kind = 'medical' and match_count is null and reason is null and lifted_on is null)
    or (kind = 'suspension' and match_count is not null and expected_return_on is null)
  )
);

comment on table public.unavailabilities is
  'Indisponibilités (specs/player-unavailability.md). kind = ''medical'' est une DONNÉE DE SANTÉ (RGPD art. 9) : incluse dans la purge santé (RETENTION_PURGE.md §2, via expires_at). « Disponible » n''est jamais stocké.';

create index unavailabilities_user_id_idx on public.unavailabilities (user_id);

-- =========================================================================
-- 2. Helpers (private.*) — SECURITY DEFINER, même convention que
-- private.is_coach_of_team (20260811171754) : search_path = '', noms qualifiés.
-- =========================================================================

-- Miroir de isUnavailabilityActive (domain/policies/availability.ts) :
-- borne de début inclusive, borne de fin exclusive, null = sans fin.
create function private.unavailability_is_active(
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
      when 'suspension' then p_lifted_on is null or p_today < p_lifted_on
      else false
    end;
$$;

-- Le coach connecté est-il coach d'une équipe dont p_user_id est joueur ?
-- Résout « son coach » sans team_id sur la table (PO-PU-03).
create function private.is_coach_of_player(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles coach
    join public.user_roles player on player.team_id = coach.team_id
    where coach.user_id = (select auth.uid())
      and coach.role = 'coach'
      and player.user_id = p_user_id
      and player.role = 'player'
  );
$$;

revoke all on function private.unavailability_is_active(text, date, date, date, date) from public;
revoke all on function private.is_coach_of_player(uuid) from public;
grant execute on function private.unavailability_is_active(text, date, date, date, date) to authenticated;
grant execute on function private.is_coach_of_player(uuid) to authenticated;

-- =========================================================================
-- 3. RLS — table brute lisible par l'intéressé lui-même et son coach SEULEMENT
-- (spec §3 point 2). Les coéquipiers n'ont AUCUNE politique : ils passent par
-- get_team_availability (§4), qui ne renvoie que le statut projeté (AC-01).
-- =========================================================================

alter table public.unavailabilities enable row level security;

-- rbac: 'availability:read-team' (soi-même ou coach de l'équipe).
create policy unavailabilities_select_own_or_coach on public.unavailabilities
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_coach_of_player(user_id));

-- rbac: 'availability:declare' — coach de l'équipe du joueur uniquement.
-- Le mobile « déclarer » n'est PAS construit dans cette passe (UnavailabilityRepositoryImpl
-- implémente create/update, aucun écran ne les appelle encore).
create policy unavailabilities_insert_coach on public.unavailabilities
  for insert to authenticated
  with check (declared_by = (select auth.uid()) and private.is_coach_of_player(user_id));

-- rbac: 'availability:declare' (levée / modification).
create policy unavailabilities_update_coach on public.unavailabilities
  for update to authenticated
  using (private.is_coach_of_player(user_id))
  with check (private.is_coach_of_player(user_id));

-- Défense en profondeur (même geste que 20260930125319) : pas de suppression
-- client, user_id/declared_by/kind/declared_at figés après création.
revoke all on public.unavailabilities from anon;
revoke delete on public.unavailabilities from authenticated;
revoke update on public.unavailabilities from authenticated;
grant update (starts_on, expected_return_on, match_count, reason, lifted_on)
  on public.unavailabilities to authenticated;

-- =========================================================================
-- 4. get_team_availability — SEUL chemin de lecture des coéquipiers.
-- rbac: 'availability:read-team'. SECURITY DEFINER : la RLS ne s'applique pas
-- au propriétaire de la fonction, donc le test d'appartenance ci-dessous EST
-- la frontière d'autorisation (même raisonnement que get_team_roster,
-- 20260929100000). Hors équipe -> aucune ligne (pas de fuite d'existence).
--
-- Vue COACH (coach de l'équipe, prioritaire si coach ET joueur) : statut
--   complet 'available' | 'medical' | 'suspended' + dates (PO-PU-05 tranché).
-- Vue JOUEUR (toTeammateStatus) : 'medical' -> 'unavailable', et AUCUNE date
--   pour un statut médical (ni début, ni retour). Une suspension n'est pas une
--   donnée de santé : statut + dates visibles (décision développeuse 2026-10-01,
--   levée de Q-UI-01).
-- Priorité medical > suspension : règle PROVISOIRE, getAvailabilityStatus /
--   docs/DEFAULTS-A-CHALLENGER.md.
-- « Aujourd'hui » = date Europe/Paris évaluée par Postgres (PO-PU-09 ouvert).
-- ends_on = expected_return_on / lifted_on : borne EXCLUSIVE (la personne est
--   disponible CE jour-là).
-- =========================================================================

create function public.get_team_availability(p_team_id uuid)
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
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_medical_count integer;
begin
  if not (v_is_coach or v_is_player) then
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

-- =========================================================================
-- Notes (non résolu ici, à porter à la développeuse / au référent RGPD)
-- - Lecture directe de public.unavailabilities par l'intéressé ou son coach :
--   tracée par AUCUN trigger (impossible sur SELECT en Postgres). Seul le
--   chemin get_team_availability est audité. Option si l'exigence est stricte :
--   retirer la politique SELECT brute et ne lire que via RPC.
-- - Purge santé : expires_at non renseignée (durée à valider, RETENTION_PURGE.md §6).
-- - 'health_data.viewed' existe déjà dans audit_log_action_check.
-- =========================================================================
