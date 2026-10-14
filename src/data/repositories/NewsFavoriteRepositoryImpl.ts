import type { SupabaseClient } from '@supabase/supabase-js'
import type { NewsFavoriteRepository } from '@domain/repositories/news-favorite-repository'
import type { ClubNewsFavoriteRow } from '../dto/club-news-favorite-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toFavoriteNewsIds } from '../mappers/club-news-favorite-mapper'

export class NewsFavoriteRepositoryImpl implements NewsFavoriteRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  // club_news_favorites_select_own (RLS) already restricts rows to the caller;
  // the explicit user_id filter keeps the intent readable and the query indexed.
  async listFavoriteNewsIds(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('club_news_favorites')
      .select('news_id')
      .eq('user_id', userId)
      .overrideTypes<Pick<ClubNewsFavoriteRow, 'news_id'>[]>()

    if (error) throw mapSupabaseError(error)
    return toFavoriteNewsIds(data ?? [])
  }

  // Upsert on the (user_id, news_id) key: starring twice is a no-op.
  async add(userId: string, newsId: string): Promise<void> {
    const { error } = await this.client
      .from('club_news_favorites')
      .upsert({ user_id: userId, news_id: newsId }, { onConflict: 'user_id,news_id', ignoreDuplicates: true })

    if (error) throw mapSupabaseError(error)
  }

  async remove(userId: string, newsId: string): Promise<void> {
    const { error } = await this.client
      .from('club_news_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('news_id', newsId)

    if (error) throw mapSupabaseError(error)
  }
}
