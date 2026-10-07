-- specs/mob-treasurer-finances-edit.md — correction et suppression des saisies
-- Finances (lève PO-FI-06 pour /finances). Migration à PROPOSER à
-- l'application, jamais appliquée en silence (AC-FIE-18).
--
-- Miroir manuel (jamais généré) de domain/policies/rbac-matrix.ts — SEPT
-- entrées ajoutées, toutes ['treasurer'] (PO-FIE-01 : une action par politique
-- ou fonction). Chaque politique/fonction ci-dessous porte en commentaire le
-- nom de l'action correspondante :
--   'expense:update'               : expenses_update_treasurer
--   'expense:delete'               : expenses_delete_treasurer
--   'expense_category:update'      : rename_expense_category()
--   'expense_category:delete'      : expense_categories_delete_treasurer
--   'opening_balance:update'       : opening_balances_update_treasurer
--   'treasury_checkpoint:update'   : update_treasury_checkpoint()
--   'treasury_checkpoint:delete'   : delete_treasury_checkpoint()
--
-- Stockage (D-2) : UPDATE / DELETE en place, pas de contre-passation. Aucun
-- solde stocké. Aucune colonne updated_by / updated_at (PO-FIE-08) : l'audit
-- (émis depuis les use cases, jamais d'ici) est la seule trace de l'état
-- antérieur.
--
-- Aucun privilège update/delete n'est accordé sur finance_carriers,
-- treasury_checkpoints ni treasury_checkpoint_lines (fonctions seulement).
-- Aucune suppression de solde d'ouverture (PO-FIE-05).

-- =========================================================================
-- 1. Dépenses
-- =========================================================================

-- Privilège de COLONNE : recorded_by, recorded_at et season_id ne sont jamais
-- modifiables (AC-FIE-04).
grant update (amount_cents, label, spent_on, category_id, carrier_id, payment_method)
  on public.expenses to authenticated;
grant delete on public.expenses to authenticated;

-- 'expense:update' — Trésorier seul, saison en cours uniquement (avant ET
-- après), mêmes bornes de date que expenses_insert_treasurer (PO-FI-09).
create policy expenses_update_treasurer on public.expenses
  for update to authenticated
  using (
    private.has_role('treasurer')
    and season_id = (select cs.id from public.current_season() cs)
  )
  with check (
    private.has_role('treasurer')
    and season_id = (select cs.id from public.current_season() cs)
    and spent_on >= (select cs.start_date from public.current_season() cs)
    and spent_on <= current_date
  );

-- 'expense:delete' — Trésorier seul, saison en cours uniquement.
create policy expenses_delete_treasurer on public.expenses
  for delete to authenticated
  using (
    private.has_role('treasurer')
    and season_id = (select cs.id from public.current_season() cs)
  );

-- =========================================================================
-- 2. Catégories
-- =========================================================================

-- 'expense_category:update' — renommage. La clé normalisée est RECALCULÉE ici,
-- en miroir de normalizeCategoryLabel() (domain/rules/finance-form-rules.ts) et
-- de create_expense_category(). Un doublon lève 23505 sur
-- expense_categories_label_key_unique ; renommer une catégorie en elle-même
-- avec une autre casse est accepté (même ligne, même clé). color_index est
-- inchangé. Introuvable : P0002.
create or replace function public.rename_expense_category(p_id uuid, p_label text)
returns public.expense_categories
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g');
  v_key text;
  v_row public.expense_categories;
begin
  -- expense_category:update
  if not private.has_role('treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  v_key := lower(translate(
    v_label,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  ));

  update public.expense_categories
     set label = v_label, label_key = v_key
   where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'category not found' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function public.rename_expense_category(uuid, text) from public;
grant execute on function public.rename_expense_category(uuid, text) to authenticated;

-- 'expense_category:delete' — Trésorier seul. La FK expenses.category_id en
-- `on delete restrict` est le dernier rempart : une catégorie référencée par une
-- dépense (toutes saisons confondues) lève 23503.
grant delete on public.expense_categories to authenticated;

create policy expense_categories_delete_treasurer on public.expense_categories
  for delete to authenticated
  using (private.has_role('treasurer'));

-- =========================================================================
-- 3. Solde d'ouverture
-- =========================================================================

-- Privilège de COLONNE : seul amount_cents est modifiable (AC-FIE-04).
-- L'unicité (carrier_id, season_id) est inchangée : la correction est un UPDATE
-- de la ligne existante. Aucun privilège delete (PO-FIE-05).
grant update (amount_cents) on public.opening_balances to authenticated;

-- 'opening_balance:update' — Trésorier seul, saison en cours uniquement.
create policy opening_balances_update_treasurer on public.opening_balances
  for update to authenticated
  using (
    private.has_role('treasurer')
    and season_id = (select cs.id from public.current_season() cs)
  )
  with check (
    private.has_role('treasurer')
    and season_id = (select cs.id from public.current_season() cs)
  );

-- =========================================================================
-- 4. Points de trésorerie — fonctions étroites, atomiques
-- =========================================================================

-- 'treasury_checkpoint:update' — corrige UNIQUEMENT counted_cents (une ligne
-- par porteur DÉJÀ compté dans ce point) et le débrief (PO-FIE-02). Ne touche
-- JAMAIS theoretical_cents, checked_on, season_id, recorded_by ni recorded_at
-- (AC-FIE-12). Saison en cours uniquement. p_lines : [{ "carrier_id": uuid,
-- "counted_cents": int }, ...], exactement un élément par ligne existante.
-- Retourne l'écart total recalculé (constaté corrigé - théorique figé).
create or replace function public.update_treasury_checkpoint(
  p_id uuid,
  p_debrief text,
  p_lines jsonb
)
returns table (id uuid, total_variance_cents bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons;
  v_checkpoint public.treasury_checkpoints;
  v_existing_count integer;
  v_line_count integer;
  v_distinct_count integer;
  v_matching_count integer;
  v_total bigint;
begin
  -- treasury_checkpoint:update
  if not private.has_role('treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_season from public.current_season();
  select * into v_checkpoint from public.treasury_checkpoints t where t.id = p_id;
  if v_checkpoint.id is null or v_season.id is null or v_checkpoint.season_id <> v_season.id then
    raise exception 'checkpoint not found' using errcode = 'P0002';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'treasury_checkpoint: lines must be an array' using errcode = '23514';
  end if;

  select count(*) into v_existing_count
    from public.treasury_checkpoint_lines l where l.checkpoint_id = p_id;
  select count(*), count(distinct (e ->> 'carrier_id'))
    into v_line_count, v_distinct_count
    from jsonb_array_elements(p_lines) e;
  select count(*) into v_matching_count
    from jsonb_array_elements(p_lines) e
    join public.treasury_checkpoint_lines l
      on l.checkpoint_id = p_id and l.carrier_id = (e ->> 'carrier_id')::uuid;
  if v_line_count = 0
     or v_line_count <> v_existing_count
     or v_distinct_count <> v_line_count
     or v_matching_count <> v_line_count then
    raise exception 'treasury_checkpoint: exactly one line per counted carrier is required'
      using errcode = '23514';
  end if;

  update public.treasury_checkpoint_lines l
     set counted_cents = (e ->> 'counted_cents')::integer
    from jsonb_array_elements(p_lines) e
   where l.checkpoint_id = p_id
     and l.carrier_id = (e ->> 'carrier_id')::uuid;

  update public.treasury_checkpoints t
     set debrief = nullif(btrim(coalesce(p_debrief, '')), '')
   where t.id = p_id;

  select coalesce(sum(l.counted_cents - l.theoretical_cents), 0) into v_total
    from public.treasury_checkpoint_lines l where l.checkpoint_id = p_id;

  return query select p_id, v_total;
end;
$$;

revoke all on function public.update_treasury_checkpoint(uuid, text, jsonb) from public;
grant execute on function public.update_treasury_checkpoint(uuid, text, jsonb) to authenticated;

-- 'treasury_checkpoint:delete' — supprime ATOMIQUEMENT le point et toutes ses
-- lignes (lignes d'abord : la FK lignes -> point reste en `on delete
-- restrict`, sans passer à `cascade`). Saison en cours uniquement.
create or replace function public.delete_treasury_checkpoint(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons;
  v_checkpoint public.treasury_checkpoints;
begin
  -- treasury_checkpoint:delete
  if not private.has_role('treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_season from public.current_season();
  select * into v_checkpoint from public.treasury_checkpoints t where t.id = p_id;
  if v_checkpoint.id is null or v_season.id is null or v_checkpoint.season_id <> v_season.id then
    raise exception 'checkpoint not found' using errcode = 'P0002';
  end if;

  delete from public.treasury_checkpoint_lines where checkpoint_id = p_id;
  delete from public.treasury_checkpoints where id = p_id;
end;
$$;

revoke all on function public.delete_treasury_checkpoint(uuid) from public;
grant execute on function public.delete_treasury_checkpoint(uuid) to authenticated;

-- 'treasury_checkpoint:update' — lecture dédiée du point (débrief compris)
-- pour la seule feuille de correction (PO-FIE-04). get_finances_snapshot()
-- n'expose volontairement toujours PAS le débrief. Réservée au Trésorier (la
-- feuille de correction est une écriture). Retourne null si le point n'existe
-- pas.
create or replace function public.get_treasury_checkpoint_detail(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  -- treasury_checkpoint:update
  if not private.has_role('treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', t.id,
    'checked_on', t.checked_on,
    'debrief', t.debrief,
    'lines', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'carrier_id', l.carrier_id,
          'counted_cents', l.counted_cents,
          'theoretical_cents', l.theoretical_cents
        )
      )
      from public.treasury_checkpoint_lines l
      where l.checkpoint_id = t.id
    ), '[]'::jsonb)
  ) into v_result
  from public.treasury_checkpoints t
  where t.id = p_id;

  return v_result;
end;
$$;

revoke all on function public.get_treasury_checkpoint_detail(uuid) from public;
grant execute on function public.get_treasury_checkpoint_detail(uuid) to authenticated;

-- =========================================================================
-- 5. Lecture agrégée : information « catégorie utilisée » (AC-FIE-09)
-- =========================================================================
-- Seul ajout par rapport à 20261007081032_finances.sql : la clé
-- 'used_category_ids' (catégories référencées par au moins une dépense, TOUTES
-- saisons confondues). Le reste de la fonction est recopié à l'identique.
-- 'finances:read'. Le débrief n'est toujours PAS retourné.
create or replace function public.get_finances_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_season public.seasons;
  v_result jsonb;
begin
  -- finances:read
  if not (
    private.has_role('treasurer')
    or private.has_role('authorized-officer')
    or private.is_admin()
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_season from public.current_season();
  if v_season.id is null then
    return jsonb_build_object(
      'season', null,
      'carriers', '[]'::jsonb,
      'unattributed_income_cents', 0,
      'categories', '[]'::jsonb,
      'used_category_ids', '[]'::jsonb,
      'expenses', '[]'::jsonb,
      'checkpoints', '[]'::jsonb
    );
  end if;

  select jsonb_build_object(
    'season', jsonb_build_object(
      'id', v_season.id,
      'label', v_season.label,
      'start_date', v_season.start_date,
      'end_date', v_season.end_date
    ),
    'carriers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'label', c.label,
          'kind', c.kind,
          'detail', c.detail,
          'manager_name', mu.full_name,
          'opening_balance_cents', ob.amount_cents,
          'income_cents', coalesce((
            select sum(p.amount_cents)
              from public.membership_payments p
              join public.memberships m on m.id = p.membership_id
             where p.carrier_id = c.id and m.season_id = v_season.id
          ), 0)
        )
        order by c.kind, c.label
      )
      from public.finance_carriers c
      left join public.users mu on mu.id = c.manager_user_id
      left join public.opening_balances ob
        on ob.carrier_id = c.id and ob.season_id = v_season.id
    ), '[]'::jsonb),
    'unattributed_income_cents', coalesce((
      select sum(p.amount_cents)
        from public.membership_payments p
        join public.memberships m on m.id = p.membership_id
       where p.carrier_id is null and m.season_id = v_season.id
    ), 0),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', k.id, 'label', k.label, 'color_index', k.color_index)
        order by k.created_at, k.label
      )
      from public.expense_categories k
    ), '[]'::jsonb),
    'used_category_ids', coalesce((
      select jsonb_agg(distinct e.category_id)
      from public.expenses e
    ), '[]'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'category_id', e.category_id,
          'carrier_id', e.carrier_id,
          'amount_cents', e.amount_cents,
          'label', e.label,
          'spent_on', e.spent_on,
          'payment_method', e.payment_method,
          'recorded_at', e.recorded_at
        )
        order by e.spent_on desc, e.recorded_at desc
      )
      from public.expenses e
      where e.season_id = v_season.id
    ), '[]'::jsonb),
    'checkpoints', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'checked_on', t.checked_on,
          'recorded_at', t.recorded_at,
          'lines', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'carrier_id', l.carrier_id,
                'counted_cents', l.counted_cents,
                'theoretical_cents', l.theoretical_cents
              )
            )
            from public.treasury_checkpoint_lines l
            where l.checkpoint_id = t.id
          ), '[]'::jsonb)
        )
        order by t.checked_on desc, t.recorded_at desc
      )
      from public.treasury_checkpoints t
      where t.season_id = v_season.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_finances_snapshot() from public;
grant execute on function public.get_finances_snapshot() to authenticated;

-- =========================================================================
-- 6. Journal d'audit (AC-FIE-14) — deux changements, miroirs manuels de
-- domain/policies/audit-actions.ts :
--   1. audit_log_action_check admet les SEPT nouveaux codes ;
--   2. record_audit_log_entry admet le Trésorier pour ces sept codes, en plus de
--      ses codes actuels.
-- Émis depuis les use cases (Update/Delete*UseCase), jamais d'ici.
-- =========================================================================

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
      'attendance.updated',
      'dues.reminder_sent',
      'expense.recorded',
      'opening_balance.recorded',
      'treasury_checkpoint.recorded',
      'expense.updated',
      'expense.deleted',
      'expense_category.updated',
      'expense_category.deleted',
      'opening_balance.updated',
      'treasury_checkpoint.updated',
      'treasury_checkpoint.deleted'
    )
  );

create or replace function public.record_audit_log_entry(
  p_action text,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_target_type text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    private.is_admin()
    or (
      private.has_role('treasurer')
      and p_action in (
        'membership.payment_recorded',
        'dues.reminder_sent',
        'expense.recorded',
        'opening_balance.recorded',
        'treasury_checkpoint.recorded',
        'expense.updated',
        'expense.deleted',
        'expense_category.updated',
        'expense_category.deleted',
        'opening_balance.updated',
        'treasury_checkpoint.updated',
        'treasury_checkpoint.deleted'
      )
    )
  ) then
    raise exception 'not authorized to record an audit log entry';
  end if;

  insert into public.audit_log (actor_id, action, target_id, metadata, target_type, source)
  values ((select auth.uid()), p_action, p_target_id, p_metadata, p_target_type, 'usecase');
end;
$$;

revoke all on function public.record_audit_log_entry(text, uuid, jsonb, text) from public;
grant execute on function public.record_audit_log_entry(text, uuid, jsonb, text) to authenticated;
