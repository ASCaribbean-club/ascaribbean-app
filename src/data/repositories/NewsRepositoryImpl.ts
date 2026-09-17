import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClubNews } from '@domain/entities/club-news'
import type { CreateClubNewsInput, NewsRepository, UpdateClubNewsInput } from '@domain/repositories/news-repository'
import type { ClubNewsRow } from '../dto/club-news-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toClubNews, toClubNewsInsertRow, toClubNewsUpdateRow } from '../mappers/club-news-mapper'

const CLUB_NEWS_COLUMNS = 'id, title, details, link, status, published_at, created_at, created_by, expires_at'

export class NewsRepositoryImpl implements NewsRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  // No status/expiry filter here: club_news_select_visible (RLS) already
  // guarantees only published, non-expired rows can ever come back for any
  // authenticated caller — see domain/policies/news-visibility.ts's mirror
  // comment. Most-recent-first by publishedAt (PO-AT-06, provisional —
  // specs/actus.md "Questions ouvertes UI" point 1).
  async listPublished(): Promise<ClubNews[]> {
    const { data, error } = await this.client
      .from('club_news')
      .select(CLUB_NEWS_COLUMNS)
      .order('published_at', { ascending: false })
      .overrideTypes<ClubNewsRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toClubNews)
  }

  // specs/web-actus.md §2.3/AC-WA-03 — same query shape as listPublished(),
  // no extra filter written here either: club_news_select_admin (RLS)
  // widens what comes back for an admin token (every status, every expiry)
  // by OR-ing with the existing policy — this repository doesn't need to
  // know that, it just runs the same unfiltered SELECT. PO-WA-12: ordering
  // by publishedAt descending, same provisional call as listPublished().
  async listAll(): Promise<ClubNews[]> {
    const { data, error } = await this.client
      .from('club_news')
      .select(CLUB_NEWS_COLUMNS)
      .order('published_at', { ascending: false })
      .overrideTypes<ClubNewsRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toClubNews)
  }

  // club_news_insert_admin (RLS) forces created_by = auth.uid() server-side
  // (AC-WA-05) — this repository sends whatever CreateClubNewsUseCase
  // decided, but the database is the actual authority on that value.
  async create(input: CreateClubNewsInput): Promise<ClubNews> {
    const { data, error } = await this.client
      .from('club_news')
      .insert(toClubNewsInsertRow(input))
      .select(CLUB_NEWS_COLUMNS)
      .single()
      .overrideTypes<ClubNewsRow>()

    if (error) throw mapSupabaseError(error)
    return toClubNews(data)
  }

  // club_news_update_admin (RLS) — no author check, any admin may update
  // any row (§2.3).
  async update(id: string, input: UpdateClubNewsInput): Promise<ClubNews> {
    const { data, error } = await this.client
      .from('club_news')
      .update(toClubNewsUpdateRow(input))
      .eq('id', id)
      .select(CLUB_NEWS_COLUMNS)
      .single()
      .overrideTypes<ClubNewsRow>()

    if (error) throw mapSupabaseError(error)
    return toClubNews(data)
  }

  // 2026-09-17 developer decision (resolves PO-WA-06) — soft "delete": only
  // `status` changes, every other column is left untouched. Goes through
  // the SAME club_news_update_admin RLS policy as update() (it IS an
  // UPDATE) — no dedicated `delete` policy exists or is needed. A one-field
  // payload, not routed through toClubNewsUpdateRow/ClubNewsUpdateRow: that
  // type carries the 5 dialog fields this action never touches.
  async archive(id: string): Promise<ClubNews> {
    const { data, error } = await this.client
      .from('club_news')
      .update({ status: 'archived' })
      .eq('id', id)
      .select(CLUB_NEWS_COLUMNS)
      .single()
      .overrideTypes<ClubNewsRow>()

    if (error) throw mapSupabaseError(error)
    return toClubNews(data)
  }
}
