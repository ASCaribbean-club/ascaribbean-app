-- Player vote — vote_categories table, resolving PO-PV-03
-- (specs/player-vote.md §5): the positive category's id/label was left
-- open in 20260916171955_player_vote_schema.sql, so votes.category_id
-- stayed a free-text column with no referential target. Developer decision
-- (2026-09-16): exactly one row, "man of the match" / "joueur du match".
--
-- Still deliberately a single row, not a general-purpose category registry
-- ahead of a barème — AC-PV-16/PO-PV-02 (négative category rejected,
-- décision définitive) still holds. This table exists because category_id
-- needed a real foreign key, not to anticipate future categories.

create table public.vote_categories (
  id text primary key,
  label text not null
);

insert into public.vote_categories (id, label) values
  ('man_of_the_match', 'Joueur du match');

alter table public.vote_categories enable row level security;

-- Reference data, same shape as sections/seasons in the initial schema
-- (initial_schema.sql): any authenticated member reads all rows, no write
-- path via the client.
create policy vote_categories_select_authenticated on public.vote_categories
  for select to authenticated
  using (true);

-- votes.category_id now points at a real row instead of an unconstrained
-- free-text value. Table is empty (feature not live yet), so this is safe
-- to add without a backfill.
alter table public.votes
  add constraint votes_category_id_fkey
  foreign key (category_id) references public.vote_categories (id);
