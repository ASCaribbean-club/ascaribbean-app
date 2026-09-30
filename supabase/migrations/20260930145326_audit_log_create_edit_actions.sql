-- Journal d'audit — cinquième passe à specs/web-audit-logs.md (addendum du
-- 2026-09-30, "neuf nouveaux émetteurs — élargissement délibéré du
-- périmètre"). Élargit le vocabulaire d'action à neuf codes de plus, pour
-- de la création/modification de donnée structurante d'administration —
-- adhésion, saison, section, équipe (création + modification), et
-- utilisateur (modification seule, la création restant couverte par
-- `user.invited`, déjà émis par InviteUserUseCase).
--
-- ⚠️ Ceci élargit délibérément un principe de conception posé par la passe
-- initiale (§2.1 de la spec : « le vocabulaire n'est pas de la donnée »,
-- et implicitement, « le journal ne porte QUE des actions sensibles au
-- sens du CDC §11.3 »). Les neuf codes ci-dessous ne correspondent à AUCUNE
-- ligne du CDC §11.3 — ce ne sont pas des « changements de rôle », des
-- « paiements », ni des consultations de santé. C'est une décision de la
-- développeuse, prise en connaissance de cet écart (voir le cinquième
-- addendum de specs/web-audit-logs.md pour le raisonnement complet), pas
-- une extrapolation de ce que le CDC exige déjà. `news.created`/
-- `news.updated` sont explicitement EXCLUS de cet élargissement — la
-- vocation éditoriale d'`actus` reste hors du journal (même addendum).
--
-- Même convention que les deux ouvertures précédentes de cette contrainte
-- (20260930125319 : sept codes initiaux, 20260930141222 : quatre codes de
-- plus) : `drop constraint` / `add constraint audit_log_action_check` du
-- même nom, jamais un `ALTER TYPE`.
--
-- Mirroité à la main dans domain/policies/audit-actions.ts (AUDIT_ACTIONS) —
-- ce fichier TypeScript nomme cette migration en retour dans son propre
-- commentaire (CLAUDE.md §7, jamais généré dans un sens ni dans l'autre).
--
-- Les neuf codes ajoutés :
--   - membership.created / membership.updated — CreateMembershipUseCase /
--     UpdateMembershipUseCase
--   - season.created / season.updated         — CreateSeasonUseCase /
--     UpdateSeasonUseCase
--   - section.created / section.updated       — CreateSectionUseCase /
--     UpdateSectionUseCase
--   - team.created / team.updated             — CreateTeamUseCase /
--     UpdateTeamUseCase
--   - user.updated                            — UpdateUserFullNameUseCase
--     (`user.created` n'est PAS ajouté : `user.invited` couvre déjà la
--     création de compte, §4 de l'addendum "quatre nouveaux émetteurs")
--
-- Aucun changement RLS/RBAC requis : les cinq actions RBAC sous-jacentes
-- (`membership:write`, `season:write`, `section:write`, `team:write`,
-- `user:write`) sont déjà `['admin']`-only dans domain/policies/rbac-matrix.ts
-- (vérifié avant d'écrire cette migration) — la garde `private.is_admin()`
-- déjà posée sur `public.record_audit_log_entry` couvre donc les neuf
-- nouveaux codes sans modification de cette fonction.

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
      'user.updated'
    )
  );
