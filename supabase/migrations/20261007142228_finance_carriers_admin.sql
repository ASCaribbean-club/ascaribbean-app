-- specs/web-finance-carriers.md — gestion des porteurs de fonds par
-- l'Administrateur (backoffice). Lève PO-FI-03 : le commentaire d'en-tête de
-- 20261007081032_finances.sql (« créés par une migration de données
-- distincte ») devient caduc ; cette migration le remplace (la migration
-- appliquée n'est pas réécrite). Migration à PROPOSER à l'application, jamais
-- appliquée en silence (AC-FC-19).
--
-- Miroir manuel (jamais généré) de domain/policies/rbac-matrix.ts — DEUX
-- entrées ajoutées, toutes deux ['admin'] (PO-FC-08 : une action par
-- politique). Chaque politique ci-dessous porte en commentaire l'action
-- correspondante :
--   'finance_carrier:create' : finance_carriers_insert_admin
--   'finance_carrier:update' : finance_carriers_update_admin
--                              + grant update (label, detail, manager_user_id)
-- AUCUNE politique ni AUCUN privilège delete (AC-FC-02) : les FK
-- `on delete restrict` existantes restent le dernier rempart (AC-FC-04).
-- `finance_carriers_select` est inchangée ('finances:read').
--
-- Pas de colonne updated_at / updated_by / created_by : l'audit
-- (finance_carrier.created / finance_carrier.updated, émis depuis les use
-- cases, jamais d'ici) est la seule trace.

-- =========================================================================
-- 1. label_key — unicité insensible à la casse et aux accents (PO-FC-04)
-- =========================================================================

alter table public.finance_carriers add column label_key text;

-- Miroir de normalizeCategoryLabel() (domain/rules/finance-form-rules.ts) et
-- de create_expense_category() : espaces multiples réduits, accents retirés,
-- casse ignorée.
create or replace function private.finance_carrier_label_key(p_label text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(translate(
    regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g'),
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  ));
$$;

-- Rattrapage des lignes existantes (la table est vide aujourd'hui), puis
-- échec EXPLICITE si des doublons existent : jamais fusionnés en silence.
update public.finance_carriers
   set label = regexp_replace(btrim(label), '\s+', ' ', 'g'),
       label_key = private.finance_carrier_label_key(label);

do $$
begin
  if exists (
    select 1 from public.finance_carriers group by label_key having count(*) > 1
  ) then
    raise exception 'finance_carriers: duplicate labels (case/accent insensitive) exist; resolve them before applying this migration';
  end if;
end;
$$;

alter table public.finance_carriers alter column label_key set not null;
alter table public.finance_carriers
  add constraint finance_carriers_label_key_unique unique (label_key);

-- Longueurs maximales (PO-FC-05), miroir de MAX_CARRIER_LABEL_LENGTH /
-- MAX_CARRIER_DETAIL_LENGTH (domain/rules/finance-carrier-rules.ts). Le check
-- existant sur label (non vide après btrim) reste.
alter table public.finance_carriers
  add constraint finance_carriers_label_length_check check (char_length(label) <= 60),
  add constraint finance_carriers_detail_length_check check (detail is null or char_length(detail) <= 120);

-- Normalise, n'interdit rien : libellé rogné et espaces réduits, détail rogné
-- (vide -> null), label_key recalculée. Jamais reçue du client (AC-FC-05).
create or replace function private.finance_carriers_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.label := regexp_replace(btrim(coalesce(new.label, '')), '\s+', ' ', 'g');
  new.detail := nullif(btrim(coalesce(new.detail, '')), '');
  new.label_key := private.finance_carrier_label_key(new.label);
  return new;
end;
$$;

create trigger finance_carriers_normalize
  before insert or update on public.finance_carriers
  for each row execute function private.finance_carriers_normalize();

-- =========================================================================
-- 2. Écriture — Administrateur seul
-- =========================================================================

-- Privilèges de COLONNE : `kind` n'est pas modifiable après insertion
-- (PO-FC-01) ; id, created_at et label_key ne le sont jamais directement.
-- AUCUN privilège delete.
grant insert (label, kind, detail, manager_user_id) on public.finance_carriers to authenticated;
grant update (label, detail, manager_user_id) on public.finance_carriers to authenticated;

-- 'finance_carrier:create' — Administrateur seul, club-wide, sans saison.
create policy finance_carriers_insert_admin on public.finance_carriers
  for insert to authenticated
  with check (private.is_admin());

-- 'finance_carrier:update' — Administrateur seul, club-wide. Aucun trigger ni
-- règle ne rend update structurellement impossible (PO-FC-02 : un archivage
-- futur reste possible).
create policy finance_carriers_update_admin on public.finance_carriers
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- =========================================================================
-- 3. Journal d'audit — deux nouveaux codes (AC-FC-17)
-- =========================================================================
-- audit_log_action_check admet les DEUX nouveaux codes, en miroir de
-- AUDIT_ACTIONS (domain/policies/audit-actions.ts) et de
-- audit-action-labels.ts. record_audit_log_entry admet déjà l'admin pour tout
-- code : NON modifiée. Émis depuis les use cases, jamais d'ici.

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
      'finance_carrier.updated'
    )
  );
