-- specs/team-opponents.md §2.3/§2.5/§2.7 — "find or create, then link" an
-- opponent to a club team, in ONE call (= one transaction: if the link fails,
-- an opponent created in step 2 is rolled back, AC-TO-04).
--
-- Mirrors the TS action 'team:write' (domain/policies/rbac-matrix.ts,
-- AddOpponentToTeamUseCase). Admin-only through the EXISTING policies
-- opponents_insert_admin and team_opponents_insert_admin: this function is
-- deliberately NOT security definer, so those policies (and the select
-- policies) apply inside it (AC-TO-03). A non-admin caller therefore fails on
-- the first insert (AC-TO-02).
--
-- Name rule (PO-TO-01/PO-TO-02, OPEN): STRICT equality on the trimmed name
-- (case, accents and inner spaces included). No normalization and NO unique
-- constraint is added here. opponents has no unique constraint on name, so
-- several rows with the same name may exist; the one picked is deterministic:
-- the smallest id (order by id limit 1).
--
-- No policy is added or modified; no delete/update path (PO-TO-10).

create or replace function public.add_opponent_to_team(
  p_team_id uuid,
  p_name text
) returns public.opponents
language plpgsql
set search_path = ''
as $$
declare
  v_name text := btrim(p_name);
  v_opponent public.opponents;
begin
  if v_name is null or v_name = '' then
    raise exception 'opponent name is required' using errcode = '22023';
  end if;

  -- 1. find (strict equality, deterministic pick)
  select * into v_opponent
  from public.opponents
  where name = v_name
  order by id
  limit 1;

  -- 2. or create
  if not found then
    insert into public.opponents (name)
    values (v_name)
    returning * into v_opponent;
  end if;

  -- 3. link, idempotent on unique (team_id, opponent_id)
  insert into public.team_opponents (team_id, opponent_id)
  values (p_team_id, v_opponent.id)
  on conflict (team_id, opponent_id) do nothing;

  return v_opponent;
end;
$$;

-- Replaces the "Provisional" wording of the original comments: admin-only is
-- now a confirmed position (specs/create-convocation.md §2,
-- specs/team-opponents.md). Policies themselves are unchanged.
comment on policy opponents_insert_admin on public.opponents is
  'Mirrors TS action ''team:write'' (admin only) — specs/team-opponents.md §2.7. Stays bound to private.is_admin() even if ''team:write'' is widened (PO-TO-04).';
comment on policy team_opponents_insert_admin on public.team_opponents is
  'Mirrors TS action ''team:write'' (admin only) — specs/team-opponents.md §2.7.';
