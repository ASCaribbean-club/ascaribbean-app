-- specs/mob-treasurer-finances.md — Finances (dépenses et trésorerie), vue
-- mobile Trésorier, lecture seule du Dirigeant habilité. Migration à PROPOSER
-- à l'application, jamais appliquée en silence.
--
-- Mirroir manuel (jamais généré) de domain/policies/rbac-matrix.ts — ENTRÉES
-- AJOUTÉES par cette feature (aucune ligne de la matrice CDC : demande du
-- Bureau, PO-FI-01). Chaque politique/fonction ci-dessous porte en commentaire
-- le nom de l'action correspondante :
--   'finances:read'              : ['treasurer', 'authorized-officer', 'admin']
--   'expense:record'             : ['treasurer']
--   'opening_balance:record'     : ['treasurer']
--   'treasury_checkpoint:record' : ['treasurer']
-- Ce fichier est nommé en retour dans les commentaires de ces entrées.
--
-- Extensibilité (PO-FI-06, AC-FI-34) : AUCUN solde ni cumul stocké (tout est
-- calculé à la lecture), AUCUNE politique update/delete, AUCUN privilège
-- update/delete accordé, mais AUCUN trigger / règle qui l'interdirait par
-- construction. Les FK vers catégorie, porteur et saison sont en
-- `on delete restrict`. Ouvrir ces droits plus tard = une politique + une
-- entrée de matrice, sans migration destructive.
--
-- Montants : entiers de centimes. Saison : current_season() (Postgres), jamais
-- l'horloge du navigateur.
--
-- Porteurs (PO-FI-03, défaut) : AUCUNE donnée initiale n'est insérée ici.
-- Les porteurs (banque / caisses) et leur éventuel responsable sont créés par
-- une migration de données distincte, confirmée avec le Trésorier.

-- =========================================================================
-- 1. Tables
-- =========================================================================

create table public.finance_carriers (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(btrim(label)) > 0),
  kind text not null,
  -- « établissement · type de compte ». Jamais d'IBAN ni de numéro de compte.
  detail text,
  -- Responsable d'une caisse : référence à un compte. Son nom n'est exposé que
  -- par get_finances_snapshot() (nom affichable seulement, AC-FI-06).
  manager_user_id uuid references public.users (id),
  created_at timestamptz not null default now(),
  constraint finance_carriers_kind_check check (kind in ('bank', 'cash'))
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  -- Clé normalisée (casse et accents ignorés), unique. Miroir de
  -- normalizeCategoryLabel() (domain/rules/finance-form-rules.ts).
  label_key text not null,
  -- Indice dans une palette fixe côté présentation (cyclique) : jamais une couleur.
  color_index smallint not null default 0 check (color_index >= 0),
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  constraint expense_categories_label_check check (length(btrim(label)) between 1 and 40),
  constraint expense_categories_label_key_unique unique (label_key)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  category_id uuid not null references public.expense_categories (id) on delete restrict,
  carrier_id uuid not null references public.finance_carriers (id) on delete restrict,
  amount_cents integer not null,
  label text not null,
  spent_on date not null,
  -- Référentiel PROPRE aux dépenses (PO-FI-04). Miroir de
  -- EXPENSE_PAYMENT_METHODS (domain/entities/expense-payment-method.ts) : à
  -- modifier ensemble, jamais l'un sans l'autre. Distinct de
  -- membership_payments.payment_method, inchangé.
  payment_method text not null,
  recorded_by uuid not null references public.users (id),
  recorded_at timestamptz not null default now(),
  constraint expenses_amount_check check (amount_cents > 0),
  -- Miroir de MAX_EXPENSE_LABEL_LENGTH (domain/rules/finance-form-rules.ts).
  constraint expenses_label_check check (length(btrim(label)) between 1 and 120),
  constraint expenses_payment_method_check
    check (payment_method in ('card', 'transfer', 'cash', 'cheque', 'direct_debit'))
);
create index expenses_season_spent_on_idx on public.expenses (season_id, spent_on desc);

create table public.opening_balances (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.finance_carriers (id) on delete restrict,
  season_id uuid not null references public.seasons (id) on delete restrict,
  amount_cents integer not null,
  recorded_by uuid not null references public.users (id),
  recorded_at timestamptz not null default now(),
  constraint opening_balances_amount_check check (amount_cents >= 0),
  -- AC-FI-28 : une seule saisie par (porteur, saison) dans cette passe.
  constraint opening_balances_carrier_season_unique unique (carrier_id, season_id)
);

create table public.treasury_checkpoints (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  checked_on date not null,
  -- Texte libre, jamais relu par l'application ni reporté dans l'audit.
  -- Miroir de MAX_DEBRIEF_LENGTH.
  debrief text,
  recorded_by uuid not null references public.users (id),
  recorded_at timestamptz not null default now(),
  constraint treasury_checkpoints_debrief_check check (debrief is null or length(debrief) <= 500)
);

create table public.treasury_checkpoint_lines (
  checkpoint_id uuid not null references public.treasury_checkpoints (id) on delete restrict,
  carrier_id uuid not null references public.finance_carriers (id) on delete restrict,
  counted_cents integer not null,
  -- Théorique FIGÉ au moment du point, calculé côté serveur (AC-FI-17/19).
  theoretical_cents integer not null,
  primary key (checkpoint_id, carrier_id),
  constraint treasury_checkpoint_lines_counted_check check (counted_cents >= 0)
);

-- Porteur d'un versement de cotisation (AC-FI-31) : nullable, les versements
-- existants n'en ont pas. Les politiques d'insertion existantes
-- (membership_payments_insert_admin / _treasurer, 'payment:record') couvrent la
-- nouvelle colonne ; aucune nouvelle action.
alter table public.membership_payments
  add column carrier_id uuid references public.finance_carriers (id) on delete restrict;

-- Valeurs initiales de la référence des catégories (maquettes). Les couleurs
-- suivent l'ordre de la palette présentation.
insert into public.expense_categories (label, label_key, color_index) values
  ('Licences & arbitrage', 'licences & arbitrage', 0),
  ('Location terrain', 'location terrain', 1),
  ('Équipement', 'equipement', 2),
  ('Événements', 'evenements', 3),
  ('Buvette', 'buvette', 4),
  ('Déplacements', 'deplacements', 5);

-- =========================================================================
-- 2. RLS + privilèges. SELECT et INSERT seulement : AUCUN update/delete
-- accordé (PO-FI-06), par absence de droit et non par construction.
-- =========================================================================

alter table public.finance_carriers enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.opening_balances enable row level security;
alter table public.treasury_checkpoints enable row level security;
alter table public.treasury_checkpoint_lines enable row level security;

grant select on public.finance_carriers to authenticated;
grant select on public.expense_categories to authenticated;
grant select, insert on public.expenses to authenticated;
grant select, insert on public.opening_balances to authenticated;
grant select on public.treasury_checkpoints to authenticated;
grant select on public.treasury_checkpoint_lines to authenticated;

-- 'finances:read' — même trio de rôles que 'dues:read'.
create policy finance_carriers_select on public.finance_carriers
  for select to authenticated
  using (
    private.has_role('treasurer')
    or private.has_role('authorized-officer')
    or private.is_admin()
  );

-- 'finances:read'
create policy expense_categories_select on public.expense_categories
  for select to authenticated
  using (
    private.has_role('treasurer')
    or private.has_role('authorized-officer')
    or private.is_admin()
  );

-- 'finances:read'
create policy expenses_select on public.expenses
  for select to authenticated
  using (
    private.has_role('treasurer')
    or private.has_role('authorized-officer')
    or private.is_admin()
  );

-- 'finances:read'
create policy opening_balances_select on public.opening_balances
  for select to authenticated
  using (
    private.has_role('treasurer')
    or private.has_role('authorized-officer')
    or private.is_admin()
  );

-- 'finances:read'
create policy treasury_checkpoints_select on public.treasury_checkpoints
  for select to authenticated
  using (
    private.has_role('treasurer')
    or private.has_role('authorized-officer')
    or private.is_admin()
  );

-- 'finances:read'
create policy treasury_checkpoint_lines_select on public.treasury_checkpoint_lines
  for select to authenticated
  using (
    private.has_role('treasurer')
    or private.has_role('authorized-officer')
    or private.is_admin()
  );

-- 'expense:record' — Trésorier seul, auteur = l'appelant, saison en cours,
-- date dans la saison et non future (PO-FI-09). `current_date` est en UTC : le
-- fuseau du club (UTC-4) ne peut produire qu'une date locale <= current_date.
create policy expenses_insert_treasurer on public.expenses
  for insert to authenticated
  with check (
    private.has_role('treasurer')
    and recorded_by = (select auth.uid())
    and season_id = (select cs.id from public.current_season() cs)
    and spent_on >= (select cs.start_date from public.current_season() cs)
    and spent_on <= current_date
  );

-- 'opening_balance:record' — Trésorier seul, auteur = l'appelant, saison en
-- cours uniquement.
create policy opening_balances_insert_treasurer on public.opening_balances
  for insert to authenticated
  with check (
    private.has_role('treasurer')
    and recorded_by = (select auth.uid())
    and season_id = (select cs.id from public.current_season() cs)
  );

-- =========================================================================
-- 3. Lectures — 'finances:read'
-- =========================================================================

-- Liste minimale des porteurs, pour le champ facultatif « Porteur » des
-- formulaires de versement (AC-FI-31). 'finances:read'.
create or replace function public.get_finance_carriers()
returns table (id uuid, label text, kind text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- finances:read
  if not (
    private.has_role('treasurer')
    or private.has_role('authorized-officer')
    or private.is_admin()
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select c.id, c.label, c.kind
    from public.finance_carriers c
   order by c.kind, c.label;
end;
$$;

revoke all on function public.get_finance_carriers() from public;
grant execute on function public.get_finance_carriers() to authenticated;

-- Lecture agrégée de la saison en cours (AC-FI-27) : UN appel pour les deux
-- onglets. SECURITY DEFINER pour exposer le nom affichable du responsable de
-- caisse SANS élargir users_select_* (AC-FI-06) et des agrégats de versements
-- SANS rendre aucun versement nominatif (membership_payments reste illisible
-- pour le Dirigeant). 'finances:read'. Aucun solde stocké : les soldes
-- théoriques sont calculés côté domain/rules/finance-rules.ts à partir de ces
-- faits. Le débrief des points n'est volontairement PAS retourné.
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
-- 4. Écritures par fonction étroite
-- =========================================================================

-- 'expense:record' — création d'une catégorie (PO-FI-05), Trésorier seul. La
-- clé normalisée est calculée ICI (miroir de normalizeCategoryLabel() :
-- accents retirés, casse et espaces multiples ignorés) ; un doublon lève
-- 23505 sur expense_categories_label_key_unique. Non tracée (défaut §4).
create or replace function public.create_expense_category(p_label text)
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
  -- expense:record
  if not private.has_role('treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  v_key := lower(translate(
    v_label,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  ));

  insert into public.expense_categories (label, label_key, color_index, created_by)
  values (
    v_label,
    v_key,
    (select count(*) from public.expense_categories)::smallint,
    (select auth.uid())
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_expense_category(text) from public;
grant execute on function public.create_expense_category(text) to authenticated;

-- 'treasury_checkpoint:record' — enregistre un point ATOMIQUEMENT (le point +
-- une ligne par porteur, tout ou rien). Le théorique figé est calculé ICI,
-- jamais reçu du client (AC-FI-19) ; miroir de theoreticalBalanceCents()
-- (domain/rules/finance-rules.ts) : solde d'ouverture (0 si absent) +
-- versements de cotisation de la saison attribués au porteur - dépenses de la
-- saison du porteur. Un point est un CONSTAT : il ne crée ni dépense ni entrée
-- et ne modifie aucun solde. `recorded_by` = auth.uid(), jamais un paramètre.
-- p_lines : [{ "carrier_id": uuid, "counted_cents": int }, ...], exactement un
-- élément par porteur existant.
create or replace function public.record_treasury_checkpoint(
  p_checked_on date,
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
  v_checkpoint_id uuid;
  v_total bigint := 0;
  v_line record;
  v_theoretical bigint;
  v_carrier_count integer;
  v_line_count integer;
  v_distinct_count integer;
begin
  -- treasury_checkpoint:record
  if not private.has_role('treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_season from public.current_season();
  if v_season.id is null then
    raise exception 'treasury_checkpoint: no current season' using errcode = '23514';
  end if;
  if p_checked_on is null or p_checked_on > current_date then
    raise exception 'treasury_checkpoint: invalid date' using errcode = '23514';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'treasury_checkpoint: lines must be an array' using errcode = '23514';
  end if;

  select count(*) into v_carrier_count from public.finance_carriers;
  select count(*), count(distinct (l ->> 'carrier_id'))
    into v_line_count, v_distinct_count
    from jsonb_array_elements(p_lines) l;
  if v_line_count = 0 or v_line_count <> v_carrier_count or v_distinct_count <> v_line_count then
    raise exception 'treasury_checkpoint: exactly one line per carrier is required' using errcode = '23514';
  end if;

  insert into public.treasury_checkpoints (season_id, checked_on, debrief, recorded_by)
  values (v_season.id, p_checked_on, nullif(btrim(coalesce(p_debrief, '')), ''), (select auth.uid()))
  returning treasury_checkpoints.id into v_checkpoint_id;

  for v_line in
    select (l ->> 'carrier_id')::uuid as carrier_id, (l ->> 'counted_cents')::integer as counted_cents
      from jsonb_array_elements(p_lines) l
  loop
    v_theoretical :=
      coalesce((select ob.amount_cents from public.opening_balances ob
                 where ob.carrier_id = v_line.carrier_id and ob.season_id = v_season.id), 0)
      + coalesce((select sum(p.amount_cents)
                    from public.membership_payments p
                    join public.memberships m on m.id = p.membership_id
                   where p.carrier_id = v_line.carrier_id and m.season_id = v_season.id), 0)
      - coalesce((select sum(e.amount_cents) from public.expenses e
                   where e.carrier_id = v_line.carrier_id and e.season_id = v_season.id), 0);

    insert into public.treasury_checkpoint_lines (checkpoint_id, carrier_id, counted_cents, theoretical_cents)
    values (v_checkpoint_id, v_line.carrier_id, v_line.counted_cents, v_theoretical);

    v_total := v_total + (v_line.counted_cents - v_theoretical);
  end loop;

  return query select v_checkpoint_id, v_total;
end;
$$;

revoke all on function public.record_treasury_checkpoint(date, text, jsonb) from public;
grant execute on function public.record_treasury_checkpoint(date, text, jsonb) to authenticated;

-- =========================================================================
-- 5. Journal d'audit (AC-FI-21, PO-FI-07) — deux changements, mirroirs
-- manuels de domain/policies/audit-actions.ts :
--   1. audit_log_action_check admet 'expense.recorded',
--      'opening_balance.recorded', 'treasury_checkpoint.recorded' ;
--   2. record_audit_log_entry admet le Trésorier pour ces trois codes, en plus
--      de 'membership.payment_recorded' et 'dues.reminder_sent'.
-- Émises depuis les use cases (RecordExpenseUseCase, RecordOpeningBalanceUseCase,
-- RecordTreasuryCheckpointUseCase), jamais depuis les fonctions SQL ci-dessus.
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
      'treasury_checkpoint.recorded'
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
        'treasury_checkpoint.recorded'
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
