-- Journal d'audit — infrastructure only, AUCUN émetteur (specs/web-audit-logs.md
-- §1/§2). Cette migration crée la table, la vue de lecture et la seule
-- politique RLS que cette passe ouvre. Aucun trigger, aucune fonction
-- SECURITY DEFINER, aucun appel de journalisation n'est ajouté ici ni
-- ailleurs dans cette passe (§1, AC-AU-21) — la table est vide en sortie de
-- migration et le restera jusqu'à la première passe d'émetteur (PO-WU-07).
--
-- Une seule table, aucune table de référence `actions`/`audit_actions`
-- (§2.1/AC-AU-03) : le vocabulaire d'action est un `check` sur `text`,
-- mirroité à la main dans domain/policies/audit-actions.ts (jamais généré
-- dans un sens ni dans l'autre, CLAUDE.md §7 — ce fichier TypeScript nomme
-- cette migration en retour dans son propre commentaire).

-- =========================================================================
-- 1. public.audit_log — append-only du point de vue du client. Les futurs
-- émetteurs seront des triggers, des fonctions SECURITY DEFINER, ou le job
-- de purge (service_role, RETENTION_PURGE.md §5) — aucun d'eux n'a besoin
-- d'une politique atteignable par le client, ce qui est précisément
-- pourquoi aucune n'est ouverte ici (§2.5).
-- =========================================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  -- §2.4 — horodatage de l'action, sert la plage de dates et le tri
  -- (occurred_at desc, §2.6).
  occurred_at timestamptz not null default now(),
  -- PO-AU-01 (ouvert, non bloquant pour cette passe) — `on delete set
  -- null`, délibérément PAS `on delete cascade` : une ligne d'audit ne doit
  -- jamais disparaître avec l'acteur qu'elle nomme. `purge.executed` est
  -- émis par un job planifié service_role, sans acteur humain — d'où la
  -- nullabilité, rendue « Système » côté presentation/ (voir
  -- domain/entities/audit-log-entry.ts).
  actor_id uuid references public.users (id) on delete set null,
  -- §2.2 — mirroité à la main dans domain/policies/audit-actions.ts
  -- (AUDIT_ACTIONS, exactement ces sept codes). Ajouter un code est une
  -- migration (drop/add de cette contrainte), pas une ligne de donnée —
  -- délibéré, voir le commentaire de ce fichier TypeScript.
  action text not null constraint audit_log_action_check check (
    action in (
      'health_data.viewed',
      'role.granted',
      'role.revoked',
      'account.deactivated',
      'legacy_points.corrected',
      'export.nominative',
      'purge.executed'
    )
  ),
  -- §2.4 — la cible de l'action (typiquement l'utilisateur concerné).
  -- Délibérément SANS clé étrangère : la trace doit survivre à la
  -- disparition de sa cible. Non résolue en nom dans cette passe (§1,
  -- AC-AU-15) — PO-AU-02 (« target_id suffit-il ? ») reste ouvert, non
  -- bloquant.
  target_id uuid,
  -- §2.4 — le motif/l'intention que le niveau SQL ne connaît pas. Jamais
  -- rendue dans cette passe (§1, AC-AU-15) ; ne doit JAMAIS contenir de
  -- contenu médical (§4).
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.audit_log is
  'Journal d''audit append-only — voir specs/web-audit-logs.md. Aucun émetteur n''écrit encore dans cette table (PO-WU-07 reste ouvert).';

-- Index minimal pour tenir l'exigence d'affichage < 3s (§2.7, CDC §12) sur
-- trois ans de données : tri par défaut occurred_at desc (§2.6), plus le
-- couple (action, occurred_at desc) pour le filtre par action. À vérifier
-- par `explain` une fois un volume réel disponible (AC-AU-25) — pas
-- supposé suffisant a priori.
create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_action_occurred_at_idx on public.audit_log (action, occurred_at desc);

alter table public.audit_log enable row level security;

-- rbac: audit:read — mirrors domain/policies/rbac-matrix.ts's
-- 'audit:read': ['admin']. La SEULE politique que cette table porte
-- (AC-AU-04).
create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using (private.is_admin());

-- §2.5/AC-AU-04/AC-AU-06 — aucune politique INSERT/UPDATE/DELETE nulle
-- part sur cette table : RLS étant refus par défaut, leur absence suffit
-- déjà à refuser toute écriture cliente — les privilèges sont EN PLUS
-- explicitement révoqués ci-dessous, défense en profondeur (même geste que
-- `revoke update on public.users from authenticated` dans
-- 20260918122440_web_users_write_policies.sql) : une politique
-- accidentellement ajoutée plus tard et un privilège laissé ouvert ne sont
-- pas la même erreur future, fermer l'un ne ferme pas l'autre.
revoke insert, update, delete on public.audit_log from authenticated;

-- =========================================================================
-- 2. public.audit_log_entries — vue de lecture security_invoker = true,
-- comme public.convocation_responders (20260901120018, seul précédent du
-- dépôt), PAS comme public.team_active_headcount (20260818145523,
-- security_invoker = false) : cette vue n'ajoute AUCUN prédicat de son cru,
-- la RLS des tables sous-jacentes (audit_log_select_admin ci-dessus,
-- users_select_own sur public.users) s'applique au véritable appelant.
-- `metadata` n'est délibérément PAS exposée (§1/AC-AU-15).
-- =========================================================================

create view public.audit_log_entries
with (security_invoker = true)
as
select
  a.id,
  a.occurred_at,
  a.actor_id,
  -- left join, pas inner : l'acteur peut être nul (purge.executed) ou avoir
  -- disparu (PO-AU-01) — la ligne d'audit ne doit jamais disparaître du
  -- résultat pour autant (AC-AU-07).
  u.full_name as actor_full_name,
  a.action,
  a.target_id
from public.audit_log a
left join public.users u on u.id = a.actor_id;

revoke all on public.audit_log_entries from public;
grant select on public.audit_log_entries to authenticated;
