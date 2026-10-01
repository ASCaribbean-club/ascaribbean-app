-- Backoffice : convocations et présences par l'Administrateur —
-- specs/web-create-convocation.md §2/§3/§4. Aucune de ces écritures n'est
-- ouverte à un autre rôle ; les politiques du coach sont INCHANGÉES (AC-WC-05)
-- sauf le retrait de la branche admin des deux politiques de présence (voir
-- section 6, nécessaire pour borner l'admin aux convocations passées).
--
-- Miroir manuel (CLAUDE.md §7, jamais généré dans un sens ni dans l'autre) de
-- domain/policies/rbac-matrix.ts, chaque objet SQL porte en commentaire le nom
-- de l'action qu'il miroite :
--   'convocation:update'   : ['coach','admin']  -> convocations_update_admin
--   'match_details:update' : ['coach','admin']  -> match_details_update_admin
--   'meeting_details:update': ['admin']         -> meeting_details_update_admin
--   'attendance:validate'  : ['coach','admin']  -> attendance_records_*_validate_admin
-- et des prédicats de fenêtre de domain/policies/convocation-admin-windows.ts
-- (isConvocationEditable <-> date > now() and status = 'open' ;
--  canEnterAttendance    <-> date <= now() and status <> 'cancelled').
--
-- NON APPLIQUÉE par l'agent qui l'a écrite : à relire puis appliquer par la
-- développeuse. Après application, renommer le fichier avec le timestamp
-- enregistré côté distant.

-- =========================================================================
-- 1. Journal d'audit — code 'attendance.updated' (AC-WC-32)
-- =========================================================================
-- Même convention que 20260930145326 : drop / add de la même contrainte.
-- Miroir manuel : domain/policies/audit-actions.ts (AUDIT_ACTIONS).
-- convocation.created / convocation.updated ne sont PAS ajoutés : PO-WC-07 est
-- encore ouvert. public.record_audit_log_entry (gardée par private.is_admin())
-- n'a pas à changer : une écriture de coach ne produit aucune ligne (AC-WC-33).

alter table public.audit_log
  drop constraint audit_log_action_check;

alter table public.audit_log
  add constraint audit_log_action_check check (
    action in (
      'health_data.viewed',
      'role.granted',
      'role.revoked',
      'account.deactivated',
      'legacy_points.corrected',
      'export.nominative',
      'purge.executed',
      'membership.payment_recorded',
      'user.invited',
      'membership.archived',
      'password_reset.issued',
      'membership.created',
      'membership.updated',
      'season.created',
      'season.updated',
      'section.created',
      'section.updated',
      'team.created',
      'team.updated',
      'user.updated',
      'attendance.updated'
    )
  );

-- =========================================================================
-- 2. public.convocations — 'convocation:update' (admin)
-- =========================================================================
-- Privilège de colonne (additif) : un `grant update (...)` porte sur
-- (table, rôle `authenticated`), JAMAIS sur une politique. Ajouter
-- training_location_id le rend donc écrivable aussi par le coach, via
-- convocations_update_arrangements, qui ne filtre pas les colonnes : c'est le
-- trigger de la section 5 qui l'interdit à tout appelant non admin (AC-WC-21).
-- team_id, type, status, closed_*, cancelled_*, created_by restent hors de
-- tout grant (AC-WC-18).
grant update (training_location_id) on public.convocations to authenticated;

-- Politique SŒUR de convocations_update_arrangements (inchangée) : mêmes
-- fenêtre et prédicat de fenêtre, acteur différent. `using` filtre la ligne de
-- départ, `with check` la ligne résultante (une nouvelle date passée est donc
-- refusée par la base, AC-WC-18).
create policy convocations_update_admin on public.convocations
  for update to authenticated
  using (
    private.is_admin()
    and date > now()
    and status = 'open'
  )
  with check (
    private.is_admin()
    and date > now()
    and status = 'open'
  );

-- =========================================================================
-- 3. public.match_details — 'match_details:update' (admin)
-- =========================================================================
-- Même piège de grant que ci-dessus : opponent_id est protégé pour le coach
-- par le trigger de la section 5 (AC-EM-02 inchangé, AC-WC-21).
grant update (opponent_id) on public.match_details to authenticated;

create policy match_details_update_admin on public.match_details
  for update to authenticated
  using (
    private.is_admin()
    and exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and c.date > now()
        and c.status = 'open'
    )
  )
  with check (
    private.is_admin()
    and exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and c.date > now()
        and c.status = 'open'
    )
  );

-- =========================================================================
-- 4. public.meeting_details — 'meeting_details:update' (admin, nouvelle)
-- =========================================================================
-- Aucune politique UPDATE n'existait : le coach reste donc refusé par la base
-- (AC-WC-21). Le revoke retire d'abord le grant global hérité, puis seules les
-- deux colonnes métier sont réaccordées (convocation_id reste non écrivable).
revoke update on public.meeting_details from authenticated;
grant update (title, agenda) on public.meeting_details to authenticated;

create policy meeting_details_update_admin on public.meeting_details
  for update to authenticated
  using (
    private.is_admin()
    and exists (
      select 1 from public.convocations c
      where c.id = meeting_details.convocation_id
        and c.date > now()
        and c.status = 'open'
    )
  )
  with check (
    private.is_admin()
    and exists (
      select 1 from public.convocations c
      where c.id = meeting_details.convocation_id
        and c.date > now()
        and c.status = 'open'
    )
  );

-- =========================================================================
-- 5. Triggers de garde — le lien de lieu et l'adversaire sont réservés à l'admin
-- =========================================================================
-- Contrainte non négociable (specs/web-create-convocation.md §2) : un jeton
-- coach qui tente d'écrire training_location_id ou opponent_id est refusé par
-- la base, malgré l'extension des grants ci-dessus. Les appelants sans session
-- JWT (auth.uid() null : console SQL, rôle service) ne sont pas concernés,
-- pour ne pas bloquer une correction de données ; tout appelant `authenticated`
-- a un auth.uid().

create or replace function private.convocations_guard_training_location_admin_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.training_location_id is distinct from old.training_location_id
     and (select auth.uid()) is not null
     and not private.is_admin() then
    raise exception 'training_location_locked: only an administrator may change a convocation''s training location'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger convocations_guard_training_location_admin_only
  before update of training_location_id on public.convocations
  for each row execute function private.convocations_guard_training_location_admin_only();

create or replace function private.match_details_guard_opponent_admin_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.opponent_id is distinct from old.opponent_id
     and (select auth.uid()) is not null
     and not private.is_admin() then
    raise exception 'opponent_locked: only an administrator may change a match''s opponent'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger match_details_guard_opponent_admin_only
  before update of opponent_id on public.match_details
  for each row execute function private.match_details_guard_opponent_admin_only();

-- =========================================================================
-- 5b. Lieu archivé refusé aussi en modification (AC-WC-19, amende AC-WL-06)
-- =========================================================================
-- convocations_training_location_not_archived (20261001071613) ne couvrait que
-- l'insertion. Il couvre maintenant aussi l'update de training_location_id,
-- mais seulement quand la valeur CHANGE : modifier la date d'un entraînement
-- dont le lieu a été archivé depuis reste possible tant que le lien est gardé.
create or replace function public.convocations_refuse_archived_training_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.training_location_id is not null
     and (tg_op = 'INSERT' or new.training_location_id is distinct from old.training_location_id)
     and exists (
       select 1 from public.training_locations tl
       where tl.id = new.training_location_id and tl.is_archived
     ) then
    raise exception 'training_location_archived: location % is archived', new.training_location_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger convocations_training_location_not_archived on public.convocations;

create trigger convocations_training_location_not_archived
  before insert or update of training_location_id on public.convocations
  for each row execute function public.convocations_refuse_archived_training_location();

-- =========================================================================
-- 6. public.attendance_records — 'attendance:validate' (admin, passé seulement)
-- =========================================================================
-- Les politiques initiales (20260811171754) admettaient l'admin SANS fenêtre
-- (`private.is_coach_of_team(...) or private.is_admin()`). Les politiques
-- étant permissives (OU), une politique sœur « admin passé seulement » ne
-- suffirait pas : l'ancienne branche admin resterait ouverte à tout moment.
-- On les recrée donc SANS la branche admin, la branche coach étant reprise à
-- l'identique (aucune fenêtre pour un coach, inchangé, AC-WC-05), puis on
-- ajoute les politiques admin bornées (AC-WC-26). La lecture
-- (attendance_records_select_coach_admin) est inchangée.

drop policy attendance_records_insert_validate on public.attendance_records;
drop policy attendance_records_update_validate on public.attendance_records;

-- 'attendance:validate' (coach) — inchangée hors retrait de la branche admin.
create policy attendance_records_insert_validate on public.attendance_records
  for insert to authenticated
  with check (
    validated_by = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and private.is_coach_of_team(c.team_id)
    )
  );

create policy attendance_records_update_validate on public.attendance_records
  for update to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and private.is_coach_of_team(c.team_id)
    )
  )
  with check (
    validated_by = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and private.is_coach_of_team(c.team_id)
    )
  );

-- 'attendance:validate' (admin) — convocation PASSÉE (date <= now()), jamais
-- annulée ; une correction après clôture (status = 'closed') est admise.
-- validated_by = l'admin lui-même, imposé par la base (AC-WC-25).
create policy attendance_records_insert_validate_admin on public.attendance_records
  for insert to authenticated
  with check (
    validated_by = (select auth.uid())
    and private.is_admin()
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and c.date <= now()
        and c.status <> 'cancelled'
    )
  );

create policy attendance_records_update_validate_admin on public.attendance_records
  for update to authenticated
  using (
    private.is_admin()
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and c.date <= now()
        and c.status <> 'cancelled'
    )
  )
  with check (
    validated_by = (select auth.uid())
    and private.is_admin()
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and c.date <= now()
        and c.status <> 'cancelled'
    )
  );

-- =========================================================================
-- 7. RPC de modification, une par type — tout ou rien (AC-WC-20)
-- =========================================================================
-- Pas SECURITY DEFINER (comme les create_*_convocation) : les politiques
-- convocations_update_admin / match_details_update_admin /
-- meeting_details_update_admin et les triggers de garde s'appliquent à chaque
-- UPDATE de la fonction. Tout est dans une seule transaction : si la table
-- satellite refuse, l'UPDATE de convocations est annulé avec elle. Ne
-- prennent ni team_id, ni type, ni status en paramètre.
--
-- Une ligne filtrée par la RLS (passée, non 'open', hors périmètre) ne produit
-- aucune erreur Postgres : `found` est alors faux et on lève
-- 'convocation_not_editable' (errcode 42501), traduit côté client par
-- ConvocationNotEditableError (data/errors/map-supabase-error.ts).
-- Réservées à l'admin (garde explicite) : le coach garde son chemin direct
-- existant (convocations_update_arrangements / match_details_update_arrangements).

create or replace function public.update_training_convocation(
  p_convocation_id uuid,
  p_date timestamptz,
  p_training_location_id uuid
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  if not private.is_admin() then
    raise exception 'update_training_convocation: administrator only' using errcode = '42501';
  end if;

  -- location repasse à null : un entraînement référence son lieu par id.
  update public.convocations
     set date = p_date,
         training_location_id = p_training_location_id,
         location = null
   where id = p_convocation_id and type = 'training'
   returning * into v_convocation;

  if not found then
    raise exception 'convocation_not_editable: convocation % is past, not open or not a training', p_convocation_id
      using errcode = '42501';
  end if;

  return v_convocation;
end;
$$;

create or replace function public.update_match_convocation(
  p_convocation_id uuid,
  p_date timestamptz,
  p_location text,
  p_opponent_id uuid,
  p_is_home boolean,
  p_meeting_point_time timestamptz,
  p_meeting_point_location text
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  if not private.is_admin() then
    raise exception 'update_match_convocation: administrator only' using errcode = '42501';
  end if;

  update public.convocations
     set date = p_date,
         location = p_location
   where id = p_convocation_id and type = 'match'
   returning * into v_convocation;

  if not found then
    raise exception 'convocation_not_editable: convocation % is past, not open or not a match', p_convocation_id
      using errcode = '42501';
  end if;

  update public.match_details
     set opponent_id = p_opponent_id,
         is_home = p_is_home,
         meeting_point_time = p_meeting_point_time,
         meeting_point_location = p_meeting_point_location
   where convocation_id = p_convocation_id;

  if not found then
    raise exception 'convocation_not_editable: match details of % not writable', p_convocation_id
      using errcode = '42501';
  end if;

  return v_convocation;
end;
$$;

create or replace function public.update_meeting_convocation(
  p_convocation_id uuid,
  p_date timestamptz,
  p_location text,
  p_title text,
  p_agenda jsonb
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  if not private.is_admin() then
    raise exception 'update_meeting_convocation: administrator only' using errcode = '42501';
  end if;

  update public.convocations
     set date = p_date,
         location = p_location
   where id = p_convocation_id and type = 'meeting'
   returning * into v_convocation;

  if not found then
    raise exception 'convocation_not_editable: convocation % is past, not open or not a meeting', p_convocation_id
      using errcode = '42501';
  end if;

  update public.meeting_details
     set title = p_title,
         agenda = p_agenda
   where convocation_id = p_convocation_id;

  if not found then
    raise exception 'convocation_not_editable: meeting details of % not writable', p_convocation_id
      using errcode = '42501';
  end if;

  return v_convocation;
end;
$$;

revoke all on function public.update_training_convocation(uuid, timestamptz, uuid) from public;
grant execute on function public.update_training_convocation(uuid, timestamptz, uuid) to authenticated;

revoke all on function public.update_match_convocation(uuid, timestamptz, text, uuid, boolean, timestamptz, text) from public;
grant execute on function public.update_match_convocation(uuid, timestamptz, text, uuid, boolean, timestamptz, text) to authenticated;

revoke all on function public.update_meeting_convocation(uuid, timestamptz, text, text, jsonb) from public;
grant execute on function public.update_meeting_convocation(uuid, timestamptz, text, text, jsonb) to authenticated;
