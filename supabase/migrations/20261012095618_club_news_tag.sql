-- Actus v2 (docs/designs/actus): optional category shown as a badge and used
-- by the feed's filter chips. Mirrors ClubNewsTag in
-- src/domain/entities/club-news.ts. Null = untagged (only shown under "Tout").
alter table public.club_news
  add column tag text check (tag in ('club', 'equipes', 'boutique'));
