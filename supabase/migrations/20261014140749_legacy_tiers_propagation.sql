-- docs/specs/asc-legacy.md PO-LG-07 / 'legacy:manage_tiers' — tiers are edited
-- once in the backoffice "ASC Legacy" tab and apply to the CURRENT season and
-- every FUTURE season; past seasons keep the tiers they had (so a tier already
-- reached, and its reward grant, never changes retroactively).
--
-- Manual mirror (CLAUDE.md §7) of domain/policies/legacy-rules.ts
-- validateLegacyTiers: only what the table CHECKs and unique constraints already
-- enforce is repeated here (ranks and names unique per season, non-negative
-- thresholds, discount 0..100); the ordering rules live in the domain policy.

-- =========================================================================
-- 1. save_legacy_tiers — one call writes the tier set on current + future seasons
-- =========================================================================
-- Upsert by (season_id, rank): an existing tier keeps its id (so reward grants,
-- which reference it, stay valid), a new rank is added. A tier is never deleted
-- here: removing one would orphan the grants that reference it.
-- 'legacy:manage_tiers' (admin). "Current or future" = the season ends today
-- (club-local date) or later. Returns the number of seasons written.
create or replace function public.save_legacy_tiers(p_tiers jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_seasons integer;
begin
  if not private.is_admin() then
    raise exception 'not authorized to save legacy tiers';
  end if;
  if jsonb_typeof(p_tiers) is distinct from 'array' or jsonb_array_length(p_tiers) = 0 then
    raise exception 'at least one tier is required';
  end if;

  insert into public.legacy_tiers
    (season_id, rank, name, min_seasons, min_points, reward_label, discount_percent, discount_lifetime)
  select s.id, t.rank, t.name, t.min_seasons, t.min_points, t.reward_label, t.discount_percent, t.discount_lifetime
  from public.seasons s
  cross join jsonb_to_recordset(p_tiers) as t(
    rank smallint, name text, min_seasons integer, min_points integer,
    reward_label text, discount_percent smallint, discount_lifetime boolean
  )
  where s.end_date >= v_today
  on conflict (season_id, rank) do update
    set name = excluded.name,
        min_seasons = excluded.min_seasons,
        min_points = excluded.min_points,
        reward_label = excluded.reward_label,
        discount_percent = excluded.discount_percent,
        discount_lifetime = excluded.discount_lifetime;

  select count(*)::integer into v_seasons from public.seasons s where s.end_date >= v_today;
  return v_seasons;
end;
$$;

revoke all on function public.save_legacy_tiers(jsonb) from public;
grant execute on function public.save_legacy_tiers(jsonb) to authenticated;

-- =========================================================================
-- 2. A new season inherits the tiers of its closest season
-- =========================================================================
-- The previous season by start date; if there is none (a season created before
-- every existing one), the next one. No tiers anywhere: nothing is copied.
create or replace function private.legacy_copy_tiers_to_new_season()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source uuid;
begin
  select s.id into v_source
  from public.seasons s
  where s.id <> new.id
    and exists (select 1 from public.legacy_tiers t where t.season_id = s.id)
  order by (s.start_date < new.start_date) desc, abs(s.start_date - new.start_date)
  limit 1;

  if v_source is not null then
    insert into public.legacy_tiers
      (season_id, rank, name, min_seasons, min_points, reward_label, discount_percent, discount_lifetime)
    select new.id, t.rank, t.name, t.min_seasons, t.min_points, t.reward_label, t.discount_percent, t.discount_lifetime
    from public.legacy_tiers t
    where t.season_id = v_source;
  end if;

  return new;
end;
$$;

revoke all on function private.legacy_copy_tiers_to_new_season() from public;

create trigger seasons_copy_legacy_tiers
  after insert on public.seasons
  for each row execute function private.legacy_copy_tiers_to_new_season();
