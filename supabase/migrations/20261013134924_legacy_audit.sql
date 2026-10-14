-- specs asc-legacy (docs/specs/asc-legacy.md) PO-LG-08 / PO-LG-13 / PO-LG-23 —
-- audit codes and emitter guard for the Legacy business actions.
--
-- Mirrors, by hand, domain/policies/audit-actions.ts (AUDIT_ACTIONS, to be
-- updated by the next pass). Naming follows the existing `noun.past_tense`
-- style, with the `legacy_points.corrected` already present:
--   legacy_points.awarded   manual award use case            (spec: legacy.points_awarded)
--   legacy_points.corrected EXISTING code, reused for corrections (PO-LG-23;
--                           legacy.points_corrected is dropped)
--   legacy_reward.granted   reward grant use case            (spec: legacy.reward_granted)
--   legacy_rule.changed     rule create / close use case     (spec: legacy.rule_changed)
-- Emitted from the use cases only, never from a component nor a trigger.
-- Automatic awards and reconciliation deltas are NOT audited (spec §5).
--
-- Guard (record_audit_log_entry): admin for any code (unchanged); Dirigeant
-- habilite for legacy_points.awarded / legacy_points.corrected /
-- legacy_reward.granted (PO-LG-13); Tresorier keeps its finance list and gains
-- legacy_reward.granted ('legacy:grant_reward'). legacy_rule.changed is admin
-- only ('legacy:manage_rules'). The treasurer list is copied unchanged from
-- 20261007151442_finances_member_advances.sql.
--

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
      'finance_carrier.restored',
      'legacy_points.awarded',
      'legacy_reward.granted',
      'legacy_rule.changed'
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
        'expense.reimbursement_updated',
        -- 'legacy:grant_reward'
        'legacy_reward.granted'
      )
    )
    or (
      private.has_role('authorized-officer')
      and p_action in (
        -- 'legacy:award' (manual award and correction), 'legacy:grant_reward'
        'legacy_points.awarded',
        'legacy_points.corrected',
        'legacy_reward.granted'
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
