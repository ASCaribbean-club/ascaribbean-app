-- specs/mobile-treasurer.md §3 "Écriture" + amendement UI du 2026-10-05 (3)
-- (PO-TR-01(a) accepté) — le Trésorier enregistre un paiement depuis la liste
-- « Cotisations » mobile.
--
-- Mirroir manuel (jamais généré) de domain/policies/rbac-matrix.ts :
--   'payment:record': ['admin', 'treasurer']
-- Ce fichier est nommé en retour dans le commentaire de cette entrée.
-- 'membership:write' reste ['admin'] : aucune autre politique n'est touchée.
-- Toujours AUCUNE politique update/delete sur membership_payments (append-only).
--
-- Trois changements :
--   1. membership_payments_insert_treasurer  — 'payment:record'
--   2. membership_payments_select_treasurer  — voir ci-dessous
--   3. public.record_audit_log_entry         — ouverte au Trésorier pour la
--      seule action 'membership.payment_recorded' (AC-TR-17)

-- =========================================================================
-- 1. 'payment:record' — insertion par un Trésorier. recorded_by doit être
-- l'appelant lui-même : pas d'attribution à un tiers. Coexiste avec
-- membership_payments_insert_admin (les politiques permissives s'additionnent).
-- =========================================================================
create policy membership_payments_insert_treasurer on public.membership_payments
  for insert to authenticated
  with check (
    private.has_role('treasurer')
    and recorded_by = (select auth.uid())
  );

-- =========================================================================
-- 2. Lecture — nécessaire à l'insertion, pas une extension de périmètre.
-- PaymentRepositoryImpl.create() fait `insert ... returning` : PostgreSQL
-- exige alors qu'une politique SELECT accepte la ligne insérée, sans quoi
-- l'insertion échoue en 42501 même si la politique d'insertion passe.
-- Le Trésorier lit déjà tous les paiements du club via
-- get_treasurer_dues() ('dues:read', SECURITY DEFINER) : cette politique
-- n'expose donc aucune donnée nouvelle. Aucune entrée de matrice associée.
-- =========================================================================
create policy membership_payments_select_treasurer on public.membership_payments
  for select to authenticated
  using (private.has_role('treasurer'));

-- =========================================================================
-- 3. Journal d'audit — corps identique à 20260930134958, seule la garde
-- change. Le journal métier est écrit depuis le use case (CLAUDE.md §6) :
-- sans cette ouverture, RecordPaymentUseCase échouerait silencieusement
-- (erreur d'audit avalée après l'écriture du paiement) pour un Trésorier,
-- et le paiement ne serait pas tracé (CDC §11.3, « modification paiement »).
--
-- Un Trésorier ne peut écrire QUE 'membership.payment_recorded' : toute
-- autre action reste réservée à l'administrateur. `source` reste hardcodé
-- et `actor_id` lu depuis auth.uid(), jamais reçu en paramètre.
-- Mirroir TS : RecordPaymentUseCase (action 'membership.payment_recorded').
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
  if not (
    private.is_admin()
    or (private.has_role('treasurer') and p_action = 'membership.payment_recorded')
  ) then
    raise exception 'not authorized to record an audit log entry';
  end if;

  insert into public.audit_log (actor_id, action, target_id, metadata, target_type, source)
  values ((select auth.uid()), p_action, p_target_id, p_metadata, p_target_type, 'usecase');
end;
$$;

revoke all on function public.record_audit_log_entry(text, uuid, jsonb, text) from public;
grant execute on function public.record_audit_log_entry(text, uuid, jsonb, text) to authenticated;
