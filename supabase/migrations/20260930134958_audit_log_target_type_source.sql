-- Journal d'audit — troisième addendum du 2026-09-30 à specs/web-audit-logs.md
-- (voir la note datée ajoutée au bas de ce fichier de spec) : trois ajouts
-- demandés par une maquette plus récente que la passe initiale
-- (20260930125319_web_audit_logs_schema.sql) et sa passe de suivi
-- (20260930130959_audit_log_record_rpc.sql), tous les deux dans
-- domain/policies/audit-sources.ts (nomme cette migration en retour) :
--
--   1. `target_type` — résout PO-AU-02 ("target_id suffit-il ?") par "non".
--   2. `source` — QUEL genre d'émetteur a écrit la ligne : un appel de
--      use case métier ('usecase'), un job planifié service_role ('job'),
--      ou un trigger Postgres ('trigger').
--   3. `metadata` exposée par la vue — annule l'exclusion délibérée
--      d'AC-AU-15 (§1 de la spec initiale), sûr désormais puisque rien ne
--      peuple `metadata` de contenu santé/médical, voir le commentaire de
--      colonne existant sur public.audit_log.metadata.
--
-- Aucun émetteur `trigger`/`job` réel n'est construit ici (health_data.viewed,
-- purge.executed) — seule la possibilité d'écrire `source = 'trigger'`/`'job'`
-- est ouverte, pas branchée à quoi que ce soit. Hors périmètre, signalé
-- explicitement plutôt que construit par anticipation (CLAUDE.md §7).

-- =========================================================================
-- 1. target_type — PAS de CHECK, contrairement à `action` (voir le
-- commentaire de colonne de `action` dans 20260930125319). Raison, à
-- contraster explicitement :
--   - `action` porte une décision de sécurité/vocabulaire : un code
--     inconnu ne doit pas pouvoir être écrit silencieusement, et le jeu de
--     codes est fermé, architecturalement significatif (§2.2 de la spec).
--   - `target_type` n'est qu'un LIBELLÉ informatif de ce que `target_id`
--     désigne — au même titre que `note`/`metadata` sont des colonnes
--     libres. Le contraindre par un CHECK obligerait une migration à
--     chaque nouveau type d'entité auditée (user, membership, team,
--     season…), pour une colonne qui ne protège aucune décision — le même
--     genre de liberté déjà laissée à `metadata` (jsonb, sans schéma).
-- =========================================================================

alter table public.audit_log
  add column target_type text;

comment on column public.audit_log.target_type is
  'Type de l''entité que target_id désigne (ex: ''user''). Purement informatif, AUCUN CHECK contrairement à action (voir le commentaire de cette colonne) — mirroité en TypeScript par domain/entities/audit-log-entry.ts (targetType: string | null), jamais par une union fermée.';

-- =========================================================================
-- 2. source — CHECK-contrainte, comme `action` : un ensemble petit, fixe,
-- architecturalement significatif (QUEL GENRE d'émetteur a écrit la
-- ligne), pas une étiquette libre comme target_type ci-dessus.
--
-- `default 'usecase'` couvre le backfill des lignes déjà écrites à ce
-- jour : toutes proviennent de public.record_audit_log_entry
-- (20260930130959), qui n'a encore JAMAIS écrit autre chose qu'une ligne
-- d'origine use case. Ce défaut existe pour la sécurité du backfill, PAS
-- comme chemin normal — tout futur INSERT depuis record_audit_log_entry
-- continue de fixer `source` explicitement (voir §3 ci-dessous), jamais en
-- comptant sur ce défaut.
--
-- Un futur trigger Postgres (ex. un émetteur health_data.viewed) ou le
-- futur job de purge service_role (RETENTION_PURGE.md §5) devront fixer
-- respectivement `source = 'trigger'` / `source = 'job'` explicitement
-- dans leur propre INSERT — c'est précisément la raison d'être de cette
-- colonne : distinguer CES émetteurs-là des appelants de
-- record_audit_log_entry, qui restent seuls à pouvoir écrire 'usecase'
-- (voir la garde dans record_audit_log_entry ci-dessous, §3).
-- =========================================================================

alter table public.audit_log
  add column source text not null check (source in ('usecase', 'job', 'trigger')) default 'usecase';

comment on column public.audit_log.source is
  'QUEL GENRE d''émetteur a écrit cette ligne : ''usecase'' (appel depuis domain/, via record_audit_log_entry, seul chemin actuel), ''job'' (job planifié service_role, ex. futur purge.executed — aucun construit à ce jour), ''trigger'' (trigger Postgres, ex. futur health_data.viewed — aucun construit à ce jour). CHECK-contrainte comme `action` (mirroité à la main dans domain/policies/audit-sources.ts, AUDIT_SOURCES) — target_type ci-dessus n''en porte délibérément aucune, voir son propre commentaire pour la distinction.';

-- =========================================================================
-- 3. public.record_audit_log_entry — nouveau paramètre p_target_type,
-- ajouté EN FIN de liste (les noms/types des paramètres existants restent
-- inchangés, condition de CREATE OR REPLACE FUNCTION pour s'appliquer en
-- place ; PostgREST appelle cette fonction par arguments JSON nommés, donc
-- l'ordre n'a pas d'importance pour les appelants existants). `source` reste
-- délibérément absent des paramètres : seul CE RPC peut légitimement
-- prétendre 'usecase', un appelant ne doit jamais pouvoir fournir une
-- valeur arbitraire — même préoccupation de spoofing déjà documentée pour
-- `actor_id` lu depuis auth.uid() plutôt que reçu en paramètre.
-- =========================================================================

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
  -- Garde inchangée depuis 20260930130959 — voir le commentaire de cette
  -- migration pour le contexte complet.
  if not private.is_admin() then
    raise exception 'not authorized to record an audit log entry';
  end if;

  -- auth.uid() toujours lu ici, jamais reçu en paramètre (voir
  -- 20260930130959). `source` est hardcodé à 'usecase' — PAS un paramètre
  -- de cette fonction : c'est la seule ligne de code qui a le droit
  -- d'écrire cette valeur, exactement pour la raison documentée sur le
  -- commentaire de colonne de `source` ci-dessus.
  insert into public.audit_log (actor_id, action, target_id, metadata, target_type, source)
  values ((select auth.uid()), p_action, p_target_id, p_metadata, p_target_type, 'usecase');
end;
$$;

revoke all on function public.record_audit_log_entry(text, uuid, jsonb, text) from public;
grant execute on function public.record_audit_log_entry(text, uuid, jsonb, text) to authenticated;

-- =========================================================================
-- 4. public.audit_log_entries — target_type, source, metadata ajoutées EN
-- FIN de la liste SELECT existante : CREATE OR REPLACE VIEW exige que les
-- colonnes déjà présentes gardent leur ordre/position, ajouter en fin est
-- la seule option sûre en place (pas de drop/recreate — aucune raison
-- spécifique de le faire ici). `metadata` était délibérément exclue par
-- 20260930125319 (§1/AC-AU-15 de la spec initiale) — désormais exposée,
-- sûr puisqu'elle ne porte jamais de contenu santé/médical (commentaire de
-- colonne de public.audit_log.metadata). Le RLS-équivalent de la vue est
-- inchangé : toujours security_invoker = true, toujours admin-only via
-- audit_log_select_admin sur la table sous-jacente.
-- =========================================================================

create or replace view public.audit_log_entries
with (security_invoker = true)
as
select
  a.id,
  a.occurred_at,
  a.actor_id,
  u.full_name as actor_full_name,
  a.action,
  a.target_id,
  a.target_type,
  a.source,
  a.metadata
from public.audit_log a
left join public.users u on u.id = a.actor_id;
