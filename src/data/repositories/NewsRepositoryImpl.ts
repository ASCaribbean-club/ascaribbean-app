import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClubNews } from '@domain/entities/club-news'
import type { NewsRepository } from '@domain/repositories/news-repository'
import type { ClubNewsRow } from '../dto/club-news-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toClubNews } from '../mappers/club-news-mapper'

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
      .select('id, title, details, link, status, published_at, created_at, created_by, expires_at')
      .order('published_at', { ascending: false })
      .overrideTypes<ClubNewsRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toClubNews)
  }
}
