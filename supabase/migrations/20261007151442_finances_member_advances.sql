-- specs/finances-member-advances.md — dépenses avancées par un membre (partie
-- A) et archivage des porteurs (partie B, lève PO-FC-02). Migration à
-- PROPOSER à l'application, jamais appliquée en silence (AC-FA-26).
--
-- Aucune migration existante n'est modifiée. Les fonctions
-- get_finances_snapshot() et record_treasury_checkpoint() sont recopiées de
-- leur dernière définition appliquée (20261007132824_finances_edit.sql et
-- 20261007081032_finances.sql) ; seuls les changements décrits ci-dessous
-- s'y ajoutent.
--
-- Miroir manuel (jamais généré) de domain/policies/rbac-matrix.ts — DEUX
-- entrées ajoutées. Chaque fonction/politique porte en commentaire le nom de
-- l'action correspondante :
--   'expense_reimbursement:update' : ['treasurer']  set_expense_reimbursement()
--   'finance_carrier:archive'      : ['admin']      archive_finance_carrier()
--                                                   restore_finance_carrier()
-- Les politiques de dépense recréées portent le nom de leur action :
--   'expense:record'  expenses_insert_treasurer
--   'expense:update'  expenses_update_treasurer
--   'expense:delete'  expenses_delete_treasurer
-- ainsi que les politiques de solde d'ouverture ('opening_balance:record' /
-- 'opening_balance:update') et de versement ('payment:record').
--
-- Extensibilité (D-A4ter, AC-FA-12) : AUCUNE table de remboursements, AUCUNE
-- écriture sur un porteur au remboursement (PO-FA-18, OUVERT), AUCUN reste dû
-- stocké, AUCUN trigger ni contrainte qui empêcherait une future table de
-- référencer une dépense ou un membre.

-- =========================================================================
-- 1. Partie B — finance_carriers.archived_at
-- =========================================================================

-- null = actif. PAS de privilège `update` sur cette colonne : seules
-- archive_finance_carrier() / restore_finance_carrier() l'écrivent (AC-FA-15).
-- Le grant `update (label, detail, manager_user_id)` reste inchangé.
alter table public.finance_carriers add column archived_at timestamptz;

-- =========================================================================
-- 2. Partie A — public.expenses : payeur « porteur OU membre »
-- =========================================================================

alter table public.expenses alter column carrier_id drop not null;
alter table public.expenses alter column payment_method drop not null;

-- Membre ayant avancé la dépense (D-A2). `on delete restrict` : un compte qui a
-- avancé de l'argent ne peut pas être purgé (PO-FA-05).
alter table public.expenses
  add column advanced_by_user_id uuid references public.users (id) on delete restrict;

-- État de remboursement STOCKÉ (D-A4bis) : null = à rembourser ; renseignée =
-- remboursée à cette date, saisie par le Trésorier (PO-FA-20). Un ÉTAT, jamais
-- un montant dû (AC-FI-34).
alter table public.expenses add column reimbursed_on date;

create index expenses_advanced_by_user_idx
  on public.expenses (advanced_by_user_id)
  where advanced_by_user_id is not null;

-- Exactement UN payeur : un porteur ou un membre (D-A2).
alter table public.expenses
  add constraint expenses_payer_check
  check (num_nonnulls(carrier_id, advanced_by_user_id) = 1);

-- L'état de remboursement n'existe que pour une avance, et jamais avant la
-- date de la dépense. « Pas dans le futur » dépend de l'horloge : porté par les
-- politiques et par set_expense_reimbursement(), pas par un CHECK.
alter table public.expenses
  add constraint expenses_reimbursement_check
  check (reimbursed_on is null or (advanced_by_user_id is not null and reimbursed_on >= spent_on));

-- PO-FA-04 : une dépense de porteur a toujours un mode de paiement ; pour une
-- avance, payment_method est le mode du REMBOURSEMENT, renseigné si et
-- seulement si reimbursed_on l'est. expenses_payment_method_check (cinq
-- valeurs) est inchangée : NULL la satisfait.
alter table public.expenses
  add constraint expenses_payment_method_payer_check
  check (
    (advanced_by_user_id is null and payment_method is not null)
    or (advanced_by_user_id is not null and ((reimbursed_on is null) = (payment_method is null)))
  );

-- Privilège de COLONNE : s'ajoute au grant existant (amount_cents, label,
-- spent_on, category_id, carrier_id, payment_method). recorded_by, recorded_at
-- et season_id restent non modifiables (AC-FIE-04, AC-FA-02).
grant update (advanced_by_user_id, reimbursed_on) on public.expenses to authenticated;

-- =========================================================================
-- 3. Fonctions privées
-- =========================================================================

-- Miroir de theoreticalBalanceCents() (domain/rules/finance-rules.ts) :
-- solde d'ouverture de la saison (0 si absent) + versements de cotisation de
-- la saison attribués au porteur - dépenses de la saison PAYÉES PAR ce porteur
-- (carrier_id = porteur : une avance de membre a carrier_id null et n'y figure
-- jamais, AC-FA-08). Partagée par record_treasury_checkpoint()
-- ('treasury_checkpoint:record') et archive_finance_carrier()
-- ('finance_carrier:archive'). Appelée depuis des fonctions security definer :
-- aucun grant execute nécessaire.
create or replace function private.carrier_theoretical_balance_cents(p_carrier_id uuid, p_season_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select ob.amount_cents from public.opening_balances ob
               where ob.carrier_id = p_carrier_id and ob.season_id = p_season_id), 0)::bigint
    + coalesce((select sum(p.amount_cents)
                  from public.membership_payments p
                  join public.memberships m on m.id = p.membership_id
                 where p.carrier_id = p_carrier_id and m.season_id = p_season_id), 0)::bigint
    - coalesce((select sum(e.amount_cents) from public.expenses e
                 where e.carrier_id = p_carrier_id and e.season_id = p_season_id), 0)::bigint;
$$;

revoke all on function private.carrier_theoretical_balance_cents(uuid, uuid) from public;

-- Invariant « un porteur archivé a toujours un solde courant nul » (§2.6) :
-- vrai si le porteur est null (pas de porteur) ou non archivé. Utilisée par les
-- politiques ci-dessous, donc exécutée sous les droits de l'appelant : grant
-- execute nécessaire (même convention que private.has_role).
create or replace function private.finance_carrier_is_active(p_carrier_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_carrier_id is null
    or exists (
      select 1 from public.finance_carriers c
       where c.id = p_carrier_id and c.archived_at is null
    );
$$;

revoke all on function private.finance_carrier_is_active(uuid) from public;
grant execute on function private.finance_carrier_is_active(uuid) to authenticated;

-- =========================================================================
-- 4. Partie B — archivage et restauration (Administrateur seul)
-- =========================================================================

-- 'finance_carrier:archive' — refusé dans trois cas (§2.5), chacun avec son
-- message nommant la cause (mappé côté data/errors/map-supabase-error.ts) :
--   finance_carrier_no_season        aucune saison en cours
--   finance_carrier_opening_missing  solde d'ouverture de la saison non saisi
--   finance_carrier_non_zero_balance solde courant non nul
-- Le solde est calculé ICI, ligne du porteur verrouillée, jamais fourni par le
-- client. Une écriture concurrente (dépense/versement) validée après ce calcul
-- est une fenêtre étroite assumée : la politique d'insertion relit l'état
-- d'archivage à son propre instant.
create or replace function public.archive_finance_carrier(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_carrier public.finance_carriers;
  v_season public.seasons;
begin
  -- finance_carrier:archive
  if not private.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_carrier from public.finance_carriers c where c.id = p_id for update;
  if v_carrier.id is null then
    raise exception 'finance_carrier_not_found' using errcode = 'P0002';
  end if;
  if v_carrier.archived_at is not null then
    raise exception 'finance_carrier_already_archived' using errcode = '23514';
  end if;

  select * into v_season from public.current_season();
  if v_season.id is null then
    raise exception 'finance_carrier_no_season' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.opening_balances ob
     where ob.carrier_id = p_id and ob.season_id = v_season.id
  ) then
    raise exception 'finance_carrier_opening_missing' using errcode = '23514';
  end if;

  if private.carrier_theoretical_balance_cents(p_id, v_season.id) <> 0 then
    raise exception 'finance_carrier_non_zero_balance' using errcode = '23514';
  end if;

  update public.finance_carriers set archived_at = now() where id = p_id;
end;
$$;

revoke all on function public.archive_finance_carrier(uuid) from public;
grant execute on function public.archive_finance_carrier(uuid) to authenticated;

-- 'finance_carrier:archive' (une seule action pour archiver ET restaurer,
-- PO-FA-06).
create or replace function public.restore_finance_carrier(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_carrier public.finance_carriers;
begin
  -- finance_carrier:archive
  if not private.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_carrier from public.finance_carriers c where c.id = p_id for update;
  if v_carrier.id is null then
    raise exception 'finance_carrier_not_found' using errcode = 'P0002';
  end if;
  if v_carrier.archived_at is null then
    raise exception 'finance_carrier_not_archived' using errcode = '23514';
  end if;

  update public.finance_carriers set archived_at = null where id = p_id;
end;
$$;

revoke all on function public.restore_finance_carrier(uuid) from public;
grant execute on function public.restore_finance_carrier(uuid) to authenticated;

-- =========================================================================
-- 5. Politiques recréées — payeur, remboursement, porteur archivé
-- =========================================================================

-- 'expense:record' — conditions actuelles (Trésorier, auteur = l'appelant,
-- saison en cours, date dans la saison et non future ; `current_date` est en
-- UTC : le fuseau du club (UTC-4) ne peut produire qu'une date locale <=
-- current_date) + date de remboursement non future + porteur non archivé.
drop policy expenses_insert_treasurer on public.expenses;
create policy expenses_insert_treasurer on public.expenses
  for insert to authenticated
  with check (
    private.has_role('treasurer')
    and recorded_by = (select auth.uid())
    and season_id = (select cs.id from public.current_season() cs)
    and spent_on >= (select cs.start_date from public.current_season() cs)
    and spent_on <= current_date
    and (reimbursed_on is null or reimbursed_on <= current_date)
    and private.finance_carrier_is_active(carrier_id)
  );

-- 'expense:update' — saison en cours uniquement (avant ET après) ; l'ancien et
-- le nouveau porteur ne sont pas archivés (PO-FA-13). L'état de remboursement
-- d'une avance d'une saison PASSÉE ne passe que par set_expense_reimbursement().
drop policy expenses_update_treasurer on public.expenses;
create policy expenses_update_treasurer on public.expenses
  for update to authenticated
  using (
    private.has_role('treasurer')
    and season_id = (select cs.id from public.current_season() cs)
    and private.finance_carrier_is_active(carrier_id)
  )
  with check (
    private.has_role('treasurer')
    and season_id = (select cs.id from public.current_season() cs)
    and spent_on >= (select cs.start_date from public.current_season() cs)
    and spent_on <= current_date
    and (reimbursed_on is null or reimbursed_on <= current_date)
    and private.finance_carrier_is_active(carrier_id)
  );

-- 'expense:delete' — saison en cours, porteur non archivé.
drop policy expenses_delete_treasurer on public.expenses;
create policy expenses_delete_treasurer on public.expenses
  for delete to authenticated
  using (
    private.has_role('treasurer')
    and season_id = (select cs.id from public.current_season() cs)
    and private.finance_carrier_is_active(carrier_id)
  );

-- 'opening_balance:record' — saisie : porteur non archivé.
drop policy opening_balances_insert_treasurer on public.opening_balances;
create policy opening_balances_insert_treasurer on public.opening_balances
  for insert to authenticated
  with check (
    private.has_role('treasurer')
    and recorded_by = (select auth.uid())
    and season_id = (select cs.id from public.current_season() cs)
    and private.finance_carrier_is_active(carrier_id)
  );

-- 'opening_balance:update' — correction : porteur non archivé.
drop policy opening_balances_update_treasurer on public.opening_balances;
create policy opening_balances_update_treasurer on public.opening_balances
  for update to authenticated
  using (
    private.has_role('treasurer')
    and season_id = (select cs.id from public.current_season() cs)
    and private.finance_carrier_is_active(carrier_id)
  )
  with check (
    private.has_role('treasurer')
    and season_id = (select cs.id from public.current_season() cs)
    and private.finance_carrier_is_active(carrier_id)
  );

-- 'payment:record' — versement attribué : carrier_id null OU porteur non
-- archivé (private.finance_carrier_is_active(null) = vrai).
drop policy membership_payments_insert_admin on public.membership_payments;
create policy membership_payments_insert_admin on public.membership_payments
  for insert to authenticated
  with check (
    private.is_admin()
    and private.finance_carrier_is_active(carrier_id)
  );

drop policy membership_payments_insert_treasurer on public.membership_payments;
create policy membership_payments_insert_treasurer on public.membership_payments
  for insert to authenticated
  with check (
    private.has_role('treasurer')
    and recorded_by = (select auth.uid())
    and private.finance_carrier_is_active(carrier_id)
  );

-- =========================================================================
-- 6. Lectures — 'finances:read'
-- =========================================================================

-- Seul changement : les porteurs ARCHIVÉS ne sont plus proposés (champ
-- « Porteur » des formulaires de versement).
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
   where c.archived_at is null
   order by c.kind, c.label;
end;
$$;

revoke all on function public.get_finance_carriers() from public;
grant execute on function public.get_finance_carriers() to authenticated;

-- Recopiée de 20261007132824_finances_edit.sql, avec en plus :
--   * carriers[]  : 'archived_at' (tous les porteurs restent renvoyés) ;
--   * expenses[]  : 'season_id', 'advanced_by_user_id', 'reimbursed_on' ;
--     carrier_id et payment_method peuvent valoir null ;
--   * outstanding_advances[] : TOUTES les avances non remboursées, toutes
--     saisons confondues (PO-FA-01) ; le libellé est le même texte libre que
--     celui déjà lu par le Dirigeant pour la saison en cours (PO-FI-12) ;
--   * advance_members[]      : user_id + display_name de chaque membre ayant au
--     moins une avance, toutes saisons ;
--   * advance_candidates[]   : TOUS les comptes (nom affichable seul), réservé
--     au rôle `treasurer` (PO-FA-02/03), sinon tableau vide.
-- Sans saison en cours, outstanding_advances et advance_members sont renvoyées
-- quand même ; advance_candidates reste vide (PO-FI-09). Le débrief n'est
-- toujours PAS retourné. Aucun nom autre que le nom affichable (AC-FI-06) :
-- users_select_* n'est jamais élargie.
-- 'finances:read'.
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
  v_outstanding jsonb;
  v_members jsonb;
  v_candidates jsonb;
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

  v_outstanding := coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'advanced_by_user_id', e.advanced_by_user_id,
        'amount_cents', e.amount_cents,
        'label', e.label,
        'spent_on', e.spent_on,
        'season_label', s.label
      )
      order by e.spent_on desc, e.recorded_at desc
    )
    from public.expenses e
    join public.seasons s on s.id = e.season_id
    where e.advanced_by_user_id is not null and e.reimbursed_on is null
  ), '[]'::jsonb);

  v_members := coalesce((
    select jsonb_agg(
      jsonb_build_object('user_id', u.id, 'display_name', u.full_name)
      order by u.full_name
    )
    from public.users u
    where exists (select 1 from public.expenses e where e.advanced_by_user_id = u.id)
  ), '[]'::jsonb);

  if v_season.id is null then
    return jsonb_build_object(
      'season', null,
      'carriers', '[]'::jsonb,
      'unattributed_income_cents', 0,
      'categories', '[]'::jsonb,
      'used_category_ids', '[]'::jsonb,
      'expenses', '[]'::jsonb,
      'checkpoints', '[]'::jsonb,
      'outstanding_advances', v_outstanding,
      'advance_members', v_members,
      'advance_candidates', '[]'::jsonb
    );
  end if;

  if private.has_role('treasurer') then
    v_candidates := coalesce((
      select jsonb_agg(
        jsonb_build_object('user_id', u.id, 'display_name', u.full_name)
        order by u.full_name
      )
      from public.users u
    ), '[]'::jsonb);
  else
    v_candidates := '[]'::jsonb;
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
          'archived_at', c.archived_at,
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
          'season_id', e.season_id,
          'category_id', e.category_id,
          'carrier_id', e.carrier_id,
          'advanced_by_user_id', e.advanced_by_user_id,
          'reimbursed_on', e.reimbursed_on,
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
    ), '[]'::jsonb),
    'outstanding_advances', v_outstanding,
    'advance_members', v_members,
    'advance_candidates', v_candidates
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_finances_snapshot() from public;
grant execute on function public.get_finances_snapshot() to authenticated;

-- =========================================================================
-- 7. Écritures par fonction étroite
-- =========================================================================

-- 'treasury_checkpoint:record' — recopiée de 20261007081032_finances.sql. Deux
-- changements (D-B1, AC-FA-18) : exactement UNE ligne par porteur NON ARCHIVÉ,
-- et chaque carrier_id reçu appartient à cet ensemble (une ligne pour un
-- porteur archivé ou inconnu est refusée même si le nombre de lignes
-- coïncide) ; le théorique figé passe par
-- private.carrier_theoretical_balance_cents() (miroir de
-- theoreticalBalanceCents() : les avances de membres n'y figurent jamais,
-- AC-FA-08). Un point est un CONSTAT : il ne crée ni dépense ni entrée.
-- `recorded_by` = auth.uid(), jamais un paramètre.
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
  v_matching_count integer;
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

  select count(*) into v_carrier_count from public.finance_carriers c where c.archived_at is null;
  select count(*), count(distinct (l ->> 'carrier_id'))
    into v_line_count, v_distinct_count
    from jsonb_array_elements(p_lines) l;
  select count(*) into v_matching_count
    from jsonb_array_elements(p_lines) l
    join public.finance_carriers c
      on c.id = (l ->> 'carrier_id')::uuid and c.archived_at is null;
  if v_line_count = 0
     or v_line_count <> v_carrier_count
     or v_distinct_count <> v_line_count
     or v_matching_count <> v_line_count then
    raise exception 'treasury_checkpoint: exactly one line per active carrier is required' using errcode = '23514';
  end if;

  insert into public.treasury_checkpoints (season_id, checked_on, debrief, recorded_by)
  values (v_season.id, p_checked_on, nullif(btrim(coalesce(p_debrief, '')), ''), (select auth.uid()))
  returning treasury_checkpoints.id into v_checkpoint_id;

  for v_line in
    select (l ->> 'carrier_id')::uuid as carrier_id, (l ->> 'counted_cents')::integer as counted_cents
      from jsonb_array_elements(p_lines) l
  loop
    v_theoretical := private.carrier_theoretical_balance_cents(v_line.carrier_id, v_season.id);

    insert into public.treasury_checkpoint_lines (checkpoint_id, carrier_id, counted_cents, theoretical_cents)
    values (v_checkpoint_id, v_line.carrier_id, v_line.counted_cents, v_theoretical);

    v_total := v_total + (v_line.counted_cents - v_theoretical);
  end loop;

  return query select v_checkpoint_id, v_total;
end;
$$;

revoke all on function public.record_treasury_checkpoint(date, text, jsonb) from public;
grant execute on function public.record_treasury_checkpoint(date, text, jsonb) to authenticated;

-- 'expense_reimbursement:update' — pose ou efface UNIQUEMENT reimbursed_on (et
-- payment_method) sur une AVANCE de n'importe quelle saison (PO-FA-19, option
-- (a)) : c'est la différence avec expenses_update_treasurer ('expense:update',
-- saison en cours seulement). Ne touche aucune autre colonne (montant,
-- libellé, dates, catégorie, membre, auteur, saison) ni aucun porteur
-- (PO-FA-18, OUVERT). Marquer : date <= current_date (UTC, même commentaire que
-- expenses_insert_treasurer), >= spent_on, mode parmi les cinq valeurs.
-- Annuler (p_reimbursed_on null) : les deux colonnes repassent à null,
-- p_payment_method est ignoré. Erreurs dédiées :
--   P0002 expense_not_found / expense_not_an_advance
--   23514 expense_reimbursement_invalid_date / expense_reimbursement_invalid_payment_method
create or replace function public.set_expense_reimbursement(
  p_expense_id uuid,
  p_reimbursed_on date,
  p_payment_method text
)
returns public.expenses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense public.expenses;
  v_row public.expenses;
begin
  -- expense_reimbursement:update
  if not private.has_role('treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_expense from public.expenses e where e.id = p_expense_id for update;
  if v_expense.id is null then
    raise exception 'expense_not_found' using errcode = 'P0002';
  end if;
  if v_expense.advanced_by_user_id is null then
    raise exception 'expense_not_an_advance' using errcode = 'P0002';
  end if;

  if p_reimbursed_on is null then
    update public.expenses
       set reimbursed_on = null, payment_method = null
     where id = p_expense_id
    returning * into v_row;
    return v_row;
  end if;

  if p_reimbursed_on > current_date or p_reimbursed_on < v_expense.spent_on then
    raise exception 'expense_reimbursement_invalid_date' using errcode = '23514';
  end if;
  if p_payment_method is null
     or p_payment_method not in ('card', 'transfer', 'cash', 'cheque', 'direct_debit') then
    raise exception 'expense_reimbursement_invalid_payment_method' using errcode = '23514';
  end if;

  update public.expenses
     set reimbursed_on = p_reimbursed_on, payment_method = p_payment_method
   where id = p_expense_id
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.set_expense_reimbursement(uuid, date, text) from public;
grant execute on function public.set_expense_reimbursement(uuid, date, text) to authenticated;

-- =========================================================================
-- 8. Journal d'audit (§4) — miroirs manuels de domain/policies/audit-actions.ts
--   1. audit_log_action_check admet TROIS nouveaux codes :
--      'expense.reimbursement_updated' (PO-FA-21), 'finance_carrier.archived',
--      'finance_carrier.restored' ;
--   2. record_audit_log_entry admet le Trésorier pour
--      'expense.reimbursement_updated' (en plus de ses codes actuels). Les deux
--      codes de porteur ne sont émis que par l'admin, déjà admis pour tout code.
-- Émis depuis les use cases, jamais d'ici. metadata : jamais de nom de membre
-- ni de libellé de dépense (D-A5).
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
      'treasury_checkpoint.deleted',
      'finance_carrier.created',
      'finance_carrier.updated',
      'expense.reimbursement_updated',
      'finance_carrier.archived',
      'finance_carrier.restored'
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
        'treasury_checkpoint.deleted',
        'expense.reimbursement_updated'
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
