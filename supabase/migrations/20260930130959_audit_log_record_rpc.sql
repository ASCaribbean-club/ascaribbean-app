-- Journal d'audit — premier chemin d'ÉCRITURE (specs/web-audit-logs.md, suivi
-- de la passe 20260930125319_web_audit_logs_schema.sql). Cette dernière a
-- délibérément ouvert AUCUNE politique INSERT/UPDATE/DELETE sur
-- public.audit_log et révoqué ces privilèges pour `authenticated` (§2.5,
-- AC-AU-04) : un use case ne peut donc pas écrire dans cette table comme
-- RoleAssignmentRepositoryImpl écrit dans public.user_roles. Cette migration
-- ouvre l'unique chemin prévu par la spec pour un émetteur applicatif — une
-- fonction SECURITY DEFINER — sans toucher à la politique RLS ni aux
-- privileges révoqués ci-dessus : la table reste append-only du point de vue
-- du client (§2.5), seule cette fonction peut y écrire.
--
-- Même convention SECURITY DEFINER que le reste du dépôt (`set search_path =
-- ''`, noms qualifiés `public.`/`private.`) — voir
-- 20260901125851_user_player_position.sql (get_convocation_responders) et
-- 20260821092153_convocation_rpc_search_path_fix.sql. `private.is_admin()`
-- est le même helper que celui déjà utilisé par audit_log_select_admin.
--
-- domain/repositories/audit-log-repository.ts nomme cette fonction dans son
-- propre commentaire (record()) — miroir manuel, jamais généré (CLAUDE.md §7).

create function public.record_audit_log_entry(
  p_action text,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Les seules actions que cette fonction est appelée à écrire aujourd'hui
  -- ('role.granted', 'role.revoked', voir AssignRoleUseCase/
  -- AssignCoachToTeamsUseCase/RemoveRoleAssignmentUseCase) exigent toutes
  -- 'admin' dans domain/policies/rbac-matrix.ts ('role:assign',
  -- 'role:assign-coach' et 'role:remove' sont TOUTES ['admin']-only). Cette
  -- garde est donc volontairement grossière — une seule vérification pour
  -- toute la fonction, pas un miroir par action — et devra devenir un
  -- miroir par action le jour où un code non émis par un administrateur
  -- sera câblé ici (voir la note correspondante dans
  -- specs/web-audit-logs.md sur cette passe).
  if not private.is_admin() then
    raise exception 'not authorized to record an audit log entry';
  end if;

  -- auth.uid() est lu ICI, côté serveur, jamais reçu en paramètre : un
  -- acteur que le client fournirait lui-même rendrait la trace sans valeur
  -- (n'importe quel appelant pourrait prétendre être n'importe qui). Le
  -- CHECK existant sur audit_log.action (20260930125319) continue de
  -- s'appliquer normalement à l'INSERT ci-dessous — rien à revalider ici.
  insert into public.audit_log (actor_id, action, target_id, metadata)
  values ((select auth.uid()), p_action, p_target_id, p_metadata);
end;
$$;

revoke all on function public.record_audit_log_entry(text, uuid, jsonb) from public;
grant execute on function public.record_audit_log_entry(text, uuid, jsonb) to authenticated;
