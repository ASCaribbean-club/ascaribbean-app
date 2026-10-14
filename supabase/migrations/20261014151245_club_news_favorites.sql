-- Actus favorites (docs/designs/actus/v3 — star on a card + "Favoris" filter).
--
-- Per-member bookmark of a news item: strictly private, a member only ever
-- reads/writes their own rows. Last-value-wins "current state" table, so the
-- composite primary key makes the add idempotent (upsert) and the toggle off
-- is a plain delete.
--
-- Mirrors domain/repositories/news-favorite-repository.ts. Not mirrored in
-- domain/policies/can.ts: it is a self-service action open to every role on
-- their own rows (RLS-only, see the RLS-vs-policy criterion).

create table public.club_news_favorites (
  user_id uuid not null references public.users (id) on delete cascade,
  news_id uuid not null references public.club_news (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, news_id)
);

alter table public.club_news_favorites enable row level security;

create policy club_news_favorites_select_own on public.club_news_favorites
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy club_news_favorites_insert_own on public.club_news_favorites
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy club_news_favorites_delete_own on public.club_news_favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));
