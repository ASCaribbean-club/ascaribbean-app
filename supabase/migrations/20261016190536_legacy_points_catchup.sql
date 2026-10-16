-- docs/specs/legacy-points-catchup.md — manual rule `points_catchup`
-- ("Rattrapage de points"): starting balances of the two seasons before
-- go-live, one entry per player through the existing manual award flow.
-- Applied on the remote project (version 20261016190536).
--
-- Mirrors, by hand (CLAUDE.md section 7):
--   TypeScript LEGACY_ACTIONS (src/domain/entities/legacy.ts)       <-> legacy_rules_action_check
--   TypeScript LEGACY_ACTIONS, manual channel                        <-> legacy_rules_action_channel_check
--   TypeScript legacyMinimumPoints / validateManualAward
--     (src/domain/policies/legacy-rules.ts)                          <-> private.legacy_manual_award_is_valid
--
-- Not done here, on purpose: OPEN-LPC-03 (mirroring the PO-LG-16 configuration
-- check in RLS) is not decided, so legacy_points_entries_insert_award is left
-- untouched. The chosen-season date check is TypeScript only (the season is
-- never stored; it is derived from earned_on).

-- 1. Action vocabulary — add `points_catchup`.
alter table public.legacy_rules drop constraint legacy_rules_action_check;
alter table public.legacy_rules add constraint legacy_rules_action_check check (action in (
  'training_attendance', 'match_attendance_official', 'match_attendance_friendly',
  'event_participation', 'equipment_setup', 'club_mission', 'referral',
  'solidarity_action', 'partner_contribution', 'exceptional_commitment',
  'season_end_bonus', 'points_catchup'
));

-- `points_catchup` is a MANUAL action only.
alter table public.legacy_rules drop constraint legacy_rules_action_channel_check;
alter table public.legacy_rules add constraint legacy_rules_action_channel_check check (
  (channel = 'automatic' and action in (
    'training_attendance', 'match_attendance_official', 'match_attendance_friendly',
    'event_participation', 'season_end_bonus'))
  or
  (channel = 'manual' and action in (
    'event_participation', 'equipment_setup', 'club_mission', 'referral',
    'solidarity_action', 'partner_contribution', 'exceptional_commitment',
    'points_catchup'))
);

-- 2. validateManualAward (spec section 4.9) with the catch-up minimum: a variable
-- rule accepts 0..max, except `points_catchup` which accepts 1..max (PO-LPC-02).
-- exceptional_commitment keeps its 0..50 (AC-LPC-10). Same signature as before,
-- so the RLS policy legacy_points_entries_insert_award and the grants are kept.
create or replace function private.legacy_manual_award_is_valid(
  p_rule_id uuid, p_points integer, p_earned_on date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.legacy_rules r
    where r.id = p_rule_id
      and r.channel = 'manual'
      and r.valid_from <= p_earned_on
      and (r.valid_to is null or p_earned_on <= r.valid_to)
      and (
        (r.points_kind = 'fixed' and p_points = r.points)
        or (
          r.points_kind = 'variable'
          and p_points between (case when r.action = 'points_catchup' then 1 else 0 end) and r.max_points
        )
      )
  );
$$;

-- 3. Seed the rule (OPEN-LPC-04, proposed default): valid_from is the earliest
-- of the first season start and the first convocation date, as the original
-- référentiel seed did, so every date of the past seasons resolves the rule.
-- If a past season is created LATER with an earlier start_date, the rule is not
-- valid for it (only valid_to is editable afterwards): create the seasons first.
-- Idempotent: nothing is inserted if a points_catchup rule already exists.
do $$
declare
  v_from date;
begin
  select least(
    coalesce((select min(start_date) from public.seasons), current_date),
    coalesce((select min((date at time zone 'Europe/Paris')::date) from public.convocations), current_date)
  ) into v_from;

  insert into public.legacy_rules
    (action, team_type, channel, points_kind, points, max_points, reason_required, valid_from)
  select 'points_catchup', null, 'manual', 'variable', null, 300, true, v_from
  where not exists (select 1 from public.legacy_rules where action = 'points_catchup');
end $$;
