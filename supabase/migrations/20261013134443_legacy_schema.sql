-- specs asc-legacy (docs/specs/asc-legacy.md) — ASC Legacy loyalty programme:
-- schema, RLS, immutability and initial référentiel / tiers data.
--
-- Manual mirror (CLAUDE.md §7, never generated) of the spec §4/§5 domain
-- policies. Every table / policy / function below names the rule it mirrors:
--   'legacy:read_own'      legacy_*_select_authenticated (reference data),
--                          legacy_points_entries_select_own,
--                          legacy_reward_grants_select_own
--   'legacy:read_any'      legacy_points_entries_select_any,
--                          legacy_reward_grants_select_any
--   'legacy:award'         legacy_points_entries_insert_award
--                          (validateManualAward, spec §4.9)
--   'legacy:award' (correction, PO-LG-18: Dirigeant habilite ONLY, not admin)
--                          legacy_points_entries_insert_correct
--                          (validateCorrection, spec §4.10)
--   'legacy:grant_reward'  legacy_reward_grants_insert_grant (rewardsStatus §4.8)
--   'legacy:manage_rules'  legacy_rules_insert_admin / legacy_rules_update_admin
--   'legacy:manage_tiers'  legacy_tiers_* / legacy_season_settings_*
--   computeSeniority (§4.6) <-> public.legacy_seniority()
-- Nothing is added to rbac-matrix.ts by this pass.
--
-- Conventions decided here (Mentor decisions, spec §3.1):
--   * Validity boundaries are INCLUSIVE on both ends: daterange(valid_from,
--     valid_to, '[]'), same as seasons.season_range. valid_to null = current.
--     resolveRule (§4.2) must use the same convention.
--   * "Club-local date" of a fact = (timestamptz at time zone 'Europe/Paris')::date
--     (PO-PU-09 still open elsewhere).
--

create extension if not exists btree_gist;

-- =========================================================================
-- 1. legacy_rules — versioned référentiel (PO-LG-02), 'legacy:manage_rules'
-- =========================================================================
-- One row per version of (action, team type). No is_active boolean, no
-- fallback rule. Two award channels as two ROWS (an action usable both ways,
-- event_participation, has one automatic row per team type and one manual row
-- with a null team type) instead of a 'both' channel: a 'both' row could not
-- have both a team type (automatic resolution) and none (manual, PO-LG-23).
create table public.legacy_rules (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  -- sections.type of the entry's team (PO-LG-11). Null for manual rules
  -- (PO-LG-23) and for season_end_bonus (PO-LG-26).
  team_type text,
  channel text not null,
  points_kind text not null,
  points integer,
  max_points integer,
  reason_required boolean not null default false,
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id) on delete set null,
  constraint legacy_rules_action_check check (action in (
    'training_attendance', 'match_attendance_official', 'match_attendance_friendly',
    'event_participation', 'equipment_setup', 'club_mission', 'referral',
    'solidarity_action', 'partner_contribution', 'exceptional_commitment',
    'season_end_bonus'
  )),
  constraint legacy_rules_team_type_check check (
    team_type is null or team_type in ('football', 'esport', 'echecs', 'domino')
  ),
  constraint legacy_rules_channel_check check (channel in ('automatic', 'manual')),
  -- Which channel each action of the closed vocabulary may use (spec §1 barème).
  constraint legacy_rules_action_channel_check check (
    (channel = 'automatic' and action in (
      'training_attendance', 'match_attendance_official', 'match_attendance_friendly',
      'event_participation', 'season_end_bonus'))
    or
    (channel = 'manual' and action in (
      'event_participation', 'equipment_setup', 'club_mission', 'referral',
      'solidarity_action', 'partner_contribution', 'exceptional_commitment'))
  ),
  -- Team type null <=> manual rule or season_end_bonus (PO-LG-23 / PO-LG-26).
  constraint legacy_rules_team_type_null_check check (
    (team_type is null) = (channel = 'manual' or action = 'season_end_bonus')
  ),
  constraint legacy_rules_points_kind_check check (points_kind in ('fixed', 'variable')),
  constraint legacy_rules_points_shape_check check (
    (points_kind = 'fixed' and points is not null and points >= 0 and max_points is null)
    or
    (points_kind = 'variable' and points is null and max_points is not null and max_points > 0)
  ),
  -- Automatic awards are always fixed points; only manual rules can be variable.
  constraint legacy_rules_automatic_fixed_check check (channel = 'manual' or points_kind = 'fixed'),
  constraint legacy_rules_validity_check check (valid_to is null or valid_to >= valid_from),
  -- No overlap per (action, team type) — resolveRule must be deterministic
  -- (spec §3.1). Null team type is compared as ''.
  constraint legacy_rules_no_overlap exclude using gist (
    action with =,
    (coalesce(team_type, '')) with =,
    (daterange(valid_from, valid_to, '[]')) with &&
  )
);

alter table public.legacy_rules enable row level security;

-- 'legacy:read_own' — reference data readable by every authenticated user
-- (like sections / seasons): needed to render labels, thresholds, progress and
-- the "how to earn points" page.
create policy legacy_rules_select_authenticated on public.legacy_rules
  for select to authenticated using (true);

-- 'legacy:manage_rules' (admin): create a version.
create policy legacy_rules_insert_admin on public.legacy_rules
  for insert to authenticated
  with check (private.is_admin() and created_by = (select auth.uid()));

-- 'legacy:manage_rules' (admin): the ONLY update is closing valid_to (column
-- grant, same technique as match_details); the trigger below also enforces it
-- for any other role (owner / SQL console).
create policy legacy_rules_update_admin on public.legacy_rules
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

revoke all on public.legacy_rules from anon, authenticated;
grant select, insert on public.legacy_rules to authenticated;
grant update (valid_to) on public.legacy_rules to authenticated;

-- Points are never edited in place (spec §3.1); valid_to can be set once, and
-- never before the date of an entry already awarded under this version, so a
-- rule that produced entries always still resolves at their earned_on.
-- (Trigger function defined after legacy_points_entries, section 4.)

-- =========================================================================
-- 2. legacy_season_settings — points mode per season (PO-LG-06),
--    'legacy:manage_tiers'
-- =========================================================================
create table public.legacy_season_settings (
  season_id uuid primary key references public.seasons (id) on delete cascade,
  points_mode text not null,
  constraint legacy_season_settings_mode_check check (points_mode in ('cumulative', 'per_season'))
);

alter table public.legacy_season_settings enable row level security;

create policy legacy_season_settings_select_authenticated on public.legacy_season_settings
  for select to authenticated using (true);
create policy legacy_season_settings_insert_admin on public.legacy_season_settings
  for insert to authenticated with check (private.is_admin());
create policy legacy_season_settings_update_admin on public.legacy_season_settings
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

revoke all on public.legacy_season_settings from anon, authenticated;
grant select, insert on public.legacy_season_settings to authenticated;
grant update (points_mode) on public.legacy_season_settings to authenticated;

-- =========================================================================
-- 3. legacy_tiers — thresholds per season (PO-LG-07), 'legacy:manage_tiers'
-- =========================================================================
create table public.legacy_tiers (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  rank smallint not null,
  name text not null,
  min_seasons integer not null,
  min_points integer not null,
  reward_label text not null,
  -- Informational only; applied by the Cotisations module, not here (PO-LG-07).
  discount_percent smallint not null,
  discount_lifetime boolean not null default false,
  constraint legacy_tiers_rank_check check (rank >= 1),
  constraint legacy_tiers_min_check check (min_seasons >= 0 and min_points >= 0),
  constraint legacy_tiers_discount_check check (discount_percent between 0 and 100),
  constraint legacy_tiers_season_rank_key unique (season_id, rank),
  constraint legacy_tiers_season_name_key unique (season_id, name),
  -- Target of the composite FK of legacy_reward_grants (tier belongs to season).
  constraint legacy_tiers_id_season_key unique (id, season_id)
);

alter table public.legacy_tiers enable row level security;

create policy legacy_tiers_select_authenticated on public.legacy_tiers
  for select to authenticated using (true);
create policy legacy_tiers_insert_admin on public.legacy_tiers
  for insert to authenticated with check (private.is_admin());
create policy legacy_tiers_update_admin on public.legacy_tiers
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

revoke all on public.legacy_tiers from anon, authenticated;
grant select, insert on public.legacy_tiers to authenticated;
-- season_id is not editable: a tier never moves to another season.
grant update (rank, name, min_seasons, min_points, reward_label, discount_percent, discount_lifetime)
  on public.legacy_tiers to authenticated;

-- =========================================================================
-- 4. legacy_points_entries — APPEND-ONLY ledger (PO-LG-01)
-- =========================================================================
-- Opposite of the upsert-on-conflict pattern of ConvocationResponse /
-- AttendanceRecord (CLAUDE.md §6): never aligned with them. The balance is
-- never stored (computeBalance, §4.5). The season of an entry is always
-- derived from earned_on, never from created_at.
create table public.legacy_points_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- Snapshot, signed (PO-LG-01): never recomputed from the rule.
  points integer not null,
  -- Rule version that produced it; null for a pure correction.
  rule_id uuid references public.legacy_rules (id) on delete restrict,
  -- Source discriminator + ONE nullable FK per source type (PO-LG-05), not a
  -- polymorphic source_id. 'season_end' is the third source: the automatic
  -- season_end_bonus (PO-LG-26) has neither a convocation nor a manual reason.
  source text not null,
  -- 'convocation' source. ON DELETE SET NULL (PO-LG-23 / OPEN-LG-04): the entry
  -- is kept and reads as having no navigable source. No cascade.
  convocation_id uuid references public.convocations (id) on delete set null,
  -- 'season_end' source.
  season_id uuid references public.seasons (id) on delete restrict,
  -- 'manual' source (awards and corrections): mandatory (PO-LG-19).
  reason text,
  -- Compensated entry, for a correction (PO-LG-01).
  corrects uuid references public.legacy_points_entries (id) on delete restrict,
  earned_on date not null,
  created_at timestamptz not null default now(),
  -- Actor for manual entries / corrections; null = system (automatic).
  created_by uuid references public.users (id) on delete set null,
  constraint legacy_points_entries_source_check check (source in ('convocation', 'manual', 'season_end')),
  -- Source consistency, exactly one source shape (PO-LG-05).
  constraint legacy_points_entries_source_shape_check check (
    (source = 'convocation'
      and reason is null and season_id is null and corrects is null and rule_id is not null)
    or
    (source = 'manual'
      and convocation_id is null and season_id is null
      and reason is not null and length(btrim(reason)) > 0)
    or
    (source = 'season_end'
      and convocation_id is null and season_id is not null
      and reason is null and corrects is null and rule_id is not null)
  ),
  -- A correction is a manual entry with a reason and no rule; it compensates
  -- something so cannot be zero (PO-LG-16: no cap, no floor otherwise).
  constraint legacy_points_entries_correction_check check (
    corrects is null or (source = 'manual' and rule_id is null and points <> 0)
  ),
  -- A manual non-correction entry always carries its manual rule (PO-LG-08).
  constraint legacy_points_entries_manual_rule_check check (
    source <> 'manual' or corrects is not null or rule_id is not null
  )
);

-- Season-end bonus: once per user and season (PO-LG-26), idempotent.
create unique index legacy_points_entries_season_end_key
  on public.legacy_points_entries (user_id, season_id)
  where source = 'season_end';

create index legacy_points_entries_user_earned_idx
  on public.legacy_points_entries (user_id, earned_on);
create index legacy_points_entries_convocation_idx
  on public.legacy_points_entries (convocation_id)
  where convocation_id is not null;
create index legacy_points_entries_corrects_idx
  on public.legacy_points_entries (corrects)
  where corrects is not null;

alter table public.legacy_points_entries enable row level security;

-- Immutability (PO-LG-01, AC-LG-11): NO update / delete policy AND privileges
-- revoked, so every client role is refused. The only SQL-level UPDATE allowed is
-- the one performed by the foreign keys themselves (convocation_id and
-- created_by set to null when their target is deleted), guarded below.
revoke all on public.legacy_points_entries from anon, authenticated;
grant select, insert on public.legacy_points_entries to authenticated;

create or replace function private.legacy_points_entries_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'convocation_id' - 'created_by') = (to_jsonb(old) - 'convocation_id' - 'created_by')
     and (new.convocation_id is null or new.convocation_id = old.convocation_id)
     and (new.created_by is null or new.created_by = old.created_by) then
    return new;
  end if;
  raise exception 'legacy_points_entries is append-only';
end;
$$;

create trigger legacy_points_entries_guard_update
  before update on public.legacy_points_entries
  for each row execute function private.legacy_points_entries_guard_update();

-- 'legacy:read_own' — own rows only (AC-LG-01).
create policy legacy_points_entries_select_own on public.legacy_points_entries
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 'legacy:read_any' — Dirigeant habilite, Administrateur.
create policy legacy_points_entries_select_any on public.legacy_points_entries
  for select to authenticated
  using (private.has_role('authorized-officer') or private.is_admin());

-- validateManualAward (spec §4.9) — SQL side. The rule must be manual-channel,
-- valid at earned_on (inclusive boundaries), and the points must equal the
-- fixed rule's points, or lie in 0..max for a variable rule. The reason being
-- non-empty is enforced by legacy_points_entries_source_shape_check.
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
        or (r.points_kind = 'variable' and p_points between 0 and r.max_points)
      )
  );
$$;

-- validateCorrection (spec §4.10) — SQL side: the corrected entry must belong
-- to the same user.
create or replace function private.legacy_correction_target_matches(
  p_corrects uuid, p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.legacy_points_entries e
    where e.id = p_corrects and e.user_id = p_user_id
  );
$$;

revoke all on function private.legacy_manual_award_is_valid(uuid, integer, date) from public;
revoke all on function private.legacy_correction_target_matches(uuid, uuid) from public;
-- Called from RLS policies, so executable by authenticated (same convention as
-- private.has_role).
grant execute on function private.legacy_manual_award_is_valid(uuid, integer, date) to authenticated;
grant execute on function private.legacy_correction_target_matches(uuid, uuid) to authenticated;

-- 'legacy:award' (Dirigeant habilite, Administrateur) — manual-source rows
-- only, with a valid manual rule (AC-LG-07). Convocation-source and
-- season_end rows are never insertable by a client (SECURITY DEFINER path).
create policy legacy_points_entries_insert_award on public.legacy_points_entries
  for insert to authenticated
  with check (
    (private.has_role('authorized-officer') or private.is_admin())
    and source = 'manual'
    and corrects is null
    and convocation_id is null
    and season_id is null
    and rule_id is not null
    and created_by = (select auth.uid())
    and private.legacy_manual_award_is_valid(rule_id, points, earned_on)
  );

-- 'legacy:award' (correction) — PO-LG-18: Dirigeant habilite ONLY, the
-- Administrateur does not create corrections. No rule, no cap, no floor
-- (PO-LG-16); non-zero and reason mandatory by table CHECKs.
create policy legacy_points_entries_insert_correct on public.legacy_points_entries
  for insert to authenticated
  with check (
    private.has_role('authorized-officer')
    and source = 'manual'
    and corrects is not null
    and rule_id is null
    and convocation_id is null
    and season_id is null
    and created_by = (select auth.uid())
    and private.legacy_correction_target_matches(corrects, user_id)
  );

-- Rule version guard ('legacy:manage_rules'): only valid_to may change, only
-- from null, and never earlier than an entry already awarded under it.
create or replace function private.legacy_rules_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'valid_to') <> (to_jsonb(old) - 'valid_to') then
    raise exception 'legacy_rules: only valid_to can change';
  end if;
  if old.valid_to is not null and new.valid_to is distinct from old.valid_to then
    raise exception 'legacy_rules: valid_to is already set';
  end if;
  if new.valid_to is not null and exists (
    select 1 from public.legacy_points_entries e
    where e.rule_id = new.id and e.earned_on > new.valid_to
  ) then
    raise exception 'legacy_rules: valid_to is earlier than an entry already awarded';
  end if;
  return new;
end;
$$;

create trigger legacy_rules_guard_update
  before update on public.legacy_rules
  for each row execute function private.legacy_rules_guard_update();

-- =========================================================================
-- 5. legacy_reward_grants — a handed-over reward is a fact (PO-LG-07)
-- =========================================================================
create table public.legacy_reward_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  tier_id uuid not null,
  season_id uuid not null,
  -- Snapshot of legacy_tiers.reward_label at grant time.
  reward_label text not null,
  granted_by uuid references public.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  note text,
  constraint legacy_reward_grants_tier_fk
    foreign key (tier_id, season_id) references public.legacy_tiers (id, season_id) on delete restrict,
  -- Once per (user, tier, season) (PO-LG-16); the tier already belongs to one
  -- season, the composite FK makes (user, tier) equivalent to (user, tier, season).
  constraint legacy_reward_grants_user_tier_season_key unique (user_id, tier_id, season_id)
);

alter table public.legacy_reward_grants enable row level security;

-- No update / delete path (spec §3.5; correcting a mistaken grant is done from
-- the admin dashboard later, PO-LG-25).
revoke all on public.legacy_reward_grants from anon, authenticated;
grant select, insert on public.legacy_reward_grants to authenticated;

-- 'legacy:read_own'
create policy legacy_reward_grants_select_own on public.legacy_reward_grants
  for select to authenticated using (user_id = (select auth.uid()));

-- 'legacy:read_any' (Dirigeant habilite, Administrateur). Treasurer read access
-- is NOT added here (spec §5, later RBAC pass).
create policy legacy_reward_grants_select_any on public.legacy_reward_grants
  for select to authenticated
  using (private.has_role('authorized-officer') or private.is_admin());

-- 'legacy:grant_reward' (Dirigeant habilite, Tresorier, Administrateur):
-- granted_by is the caller and the label is the tier's own label (snapshot).
-- Whether the tier is actually reached is computeTierStatus / rewardsStatus
-- (use case); not mirrored in RLS (spec §5 mirrors the roles only).
create policy legacy_reward_grants_insert_grant on public.legacy_reward_grants
  for insert to authenticated
  with check (
    (private.has_role('authorized-officer') or private.has_role('treasurer') or private.is_admin())
    and granted_by = (select auth.uid())
    and exists (
      select 1 from public.legacy_tiers t
      where t.id = legacy_reward_grants.tier_id
        and t.season_id = legacy_reward_grants.season_id
        and t.reward_label = legacy_reward_grants.reward_label
    )
  );

-- =========================================================================
-- 6. Seniority — computeSeniority (spec §4.6, PO-LG-14 / PO-LG-25)
-- =========================================================================
-- Number of distinct seasons with an `active`, NON-archived membership.
-- Pending / suspended / archived rows count for nothing. Future-season
-- memberships are NOT excluded: that point is not decided by the spec.
-- Own seniority, or any user's for Dirigeant habilite / Administrateur
-- ('legacy:read_own' / 'legacy:read_any'); the Treasurer's access is the open
-- RBAC question of spec §5. SECURITY DEFINER so it can read memberships
-- regardless of the caller's own memberships policies.
create or replace function public.legacy_seniority(p_user_id uuid default null)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(p_user_id, (select auth.uid()));
begin
  if v_user is distinct from (select auth.uid())
     and not (private.has_role('authorized-officer') or private.is_admin()) then
    raise exception 'not authorized to read this seniority';
  end if;

  return (
    select count(distinct m.season_id)::integer
    from public.memberships m
    where m.user_id = v_user
      and m.status = 'active'
      and m.archived_at is null
  );
end;
$$;

revoke all on function public.legacy_seniority(uuid) from public;
grant execute on function public.legacy_seniority(uuid) to authenticated;

-- =========================================================================
-- 7. Initial référentiel and tiers (spec §1, validated by the Bureau)
-- =========================================================================
-- valid_from of the seeded rules: the earliest of the first season start and
-- the first convocation date, so the go-live backfill (PO-LG-04) resolves a
-- rule for every past fact. Football only for automatic rules (OPEN-LG-06: no
-- rule for the other disciplines); manual rules and season_end_bonus have a
-- null team type. reason_required is true on every manual rule (PO-LG-19).
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
  values
    ('training_attendance',        'football', 'automatic', 'fixed',    5,    null, false, v_from),
    ('match_attendance_official',  'football', 'automatic', 'fixed',    5,    null, false, v_from),
    ('match_attendance_friendly',  'football', 'automatic', 'fixed',    2,    null, false, v_from),
    ('event_participation',        'football', 'automatic', 'fixed',    3,    null, false, v_from),
    ('event_participation',        null,       'manual',    'fixed',    3,    null, true,  v_from),
    ('equipment_setup',            null,       'manual',    'fixed',    2,    null, true,  v_from),
    ('club_mission',               null,       'manual',    'fixed',    15,   null, true,  v_from),
    ('referral',                   null,       'manual',    'fixed',    15,   null, true,  v_from),
    ('solidarity_action',          null,       'manual',    'fixed',    20,   null, true,  v_from),
    ('partner_contribution',       null,       'manual',    'fixed',    30,   null, true,  v_from),
    ('exceptional_commitment',     null,       'manual',    'variable', null, 50,   true,  v_from),
    ('season_end_bonus',           null,       'automatic', 'fixed',    50,   null, false, v_from);
end $$;

-- Tiers for every EXISTING season. The points mode is deliberately NOT seeded
-- (the spec gives no default): a season is "fully configured" (PO-LG-16) only
-- once the Administrateur sets its mode, so no point is awarded before that.
insert into public.legacy_tiers
  (season_id, rank, name, min_seasons, min_points, reward_label, discount_percent, discount_lifetime)
select s.id, t.rank, t.name, t.min_seasons, t.min_points, t.reward_label, t.discount_percent, t.discount_lifetime
from public.seasons s
cross join (values
  (1::smallint, 'Bronze',   1,   200, 'Ensemble d''entraînement',            5::smallint,  false),
  (2::smallint, 'Argent',   2,   400, 'Protège-tibias personnalisés + polo', 10::smallint, false),
  (3::smallint, 'Or',       3,   600, 'Kit complet d''entraînement',         15::smallint, false),
  (4::smallint, 'Émeraude', 5,  1000, 'Ensembles match personnalisés',       20::smallint, false),
  (5::smallint, 'Rubis',    7,  1400, 'Bon d''achat 200 €',                  30::smallint, false),
  (6::smallint, 'Platine', 10,  2500, 'Licence offerte, boutique à vie',     50::smallint, true)
) as t(rank, name, min_seasons, min_points, reward_label, discount_percent, discount_lifetime);
