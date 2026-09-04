-- Actus (club-wide news feed) — specs/actus.md §2.
--
-- Scope of this migration: read path only. Who may author/publish a news
-- item is OPEN (PO-AT-01, specs/actus.md §3) and explicitly not resolved
-- here — no insert/update/delete policy exists on this table yet, for any
-- role, admin included. Test data is seeded via the Supabase SQL editor
-- until that question is settled.
--
-- Mirrors src/domain/entities/club-news.ts (ClubNews / ClubNewsStatus).

create table public.club_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text not null,
  link text, -- nullable: an entry with no external link is a normal case, not an error (specs/actus.md §7)
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz, -- the date SHOWN to users, set when status flips to published; never event_date (no such column — specs/actus.md §2)
  created_at timestamptz not null default now(), -- technical/audit only, never displayed
  created_by uuid not null references public.users (id),
  expires_at timestamptz, -- null = never expires; masks visibility, is not a purge (specs/actus.md §4, PO-AT-05)
  -- Direct consequence of "published_at is set when status flips to published":
  -- a published row with no visible date would be unrenderable (AC-AT-03).
  constraint club_news_published_has_date check (status <> 'published' or published_at is not null)
);

alter table public.club_news enable row level security;

-- Mirrors domain/policies/news-visibility.ts (isNewsVisible). SQL is the
-- authority here (security) — now() is evaluated by Postgres, never
-- supplied by the client. Club-wide read: any authenticated member, no
-- team/section/season scope, identical across all 8 roles (specs/actus.md
-- §3) — same reasoning as sections/seasons in the initial schema migration.
-- No insert/update/delete policy in this pass — see header note above and
-- specs/actus.md §1/§3 (PO-AT-01).
create policy club_news_select_visible on public.club_news
  for select to authenticated
  using (status = 'published' and (expires_at is null or expires_at > now()));
