-- specs/mobile-treasurer.md — amendement du 2026-10-05 (4), §E : journal
-- d'audit des relances de cotisation (AC-TR-32). Migration à PROPOSER à
-- l'application, jamais appliquée en silence.
--
-- Deux changements, mirroirs manuels (jamais générés) de
-- src/domain/policies/audit-actions.ts :
--   1. audit_log_action_check admet 'dues.reminder_sent' ;
--   2. public.record_audit_log_entry admet le Trésorier pour ce code, en plus
--      de 'membership.payment_recorded'.
-- L'entrée est écrite depuis le use case (action métier, CLAUDE.md §6) :
-- SendDuesRemindersUseCase, une entrée par relance effectivement envoyée.

-- =========================================================================
-- 1. audit_log_action_check — liste de 20261001120000_web_create_convocation.sql
-- + 'dues.reminder_sent'. Même motif drop/add que les migrations précédentes.
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
      'dues.reminder_sent'
    )
  );

-- =========================================================================
-- 2. record_audit_log_entry — corps identique à
-- 20261005160000_treasurer_record_payment.sql, seule la garde change : un
-- Trésorier peut écrire 'membership.payment_recorded' ET 'dues.reminder_sent',
-- rien d'autre (toute autre action reste réservée à l'administrateur).
-- `source` reste hardcodé, `actor_id` lu depuis auth.uid().
-- Mirroir TS : SendDuesRemindersUseCase (action 'dues.reminder_sent').
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
    or (
      private.has_role('treasurer')
      and p_action in ('membership.payment_recorded', 'dues.reminder_sent')
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
