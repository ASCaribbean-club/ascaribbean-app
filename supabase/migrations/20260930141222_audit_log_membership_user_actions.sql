-- Journal d'audit — quatrième passe à specs/web-audit-logs.md (addendum du
-- 2026-09-30, "quatre nouveaux émetteurs") : élargit le vocabulaire d'action
-- pour couvrir les quatre premiers émetteurs `membership`/`user` réellement
-- câblés dans cette passe (RecordPaymentUseCase, ArchiveMembershipUseCase,
-- InviteUserUseCase, GeneratePasswordResetLinkUseCase). Suit la même
-- convention que la première ouverture de `action`
-- (20260930125319_web_audit_logs_schema.sql, `audit_log_action_check`) :
-- `drop constraint` / `add constraint` du même nom, jamais un `ALTER TYPE`
-- (§2.2, "ajouter un code est une migration, pas une ligne de donnée").
--
-- Mirroité à la main dans domain/policies/audit-actions.ts (AUDIT_ACTIONS) —
-- ce fichier TypeScript nomme cette migration en retour dans son propre
-- commentaire (CLAUDE.md §7, jamais généré dans un sens ni dans l'autre).
--
-- Les quatre codes ajoutés, chacun déjà nommé par le CDC §11.3 :
--   - membership.payment_recorded — "modification paiement"
--   - user.invited                — "création de compte" (la moitié
--     "suppression" de cette ligne du CDC reste sans émetteur, account.deactivated
--     existant déjà couvrant un besoin voisin mais distinct, non touché ici)
--   - membership.archived         — pas de ligne CDC dédiée, mais la même
--     famille "modification paiement/adhésion" que web-memberships.md §4
--     range sous PO-WM-09
--   - password_reset.issued       — pas de ligne CDC dédiée nommément, même
--     famille "changement d'accès à un compte" que role.granted/role.revoked

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
      'password_reset.issued'
    )
  );
