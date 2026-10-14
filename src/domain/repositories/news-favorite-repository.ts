// A member's private bookmarks on news items (club_news_favorites). Own rows
// only — RLS scopes every call to the authenticated user.
export interface NewsFavoriteRepository {
  // Ids of the news the member starred. Ids may point at news that is no
  // longer visible (expired/archived): the feed simply never matches them.
  listFavoriteNewsIds(userId: string): Promise<string[]>

  // Idempotent: adding twice is not an error (last value wins).
  add(userId: string, newsId: string): Promise<void>

  remove(userId: string, newsId: string): Promise<void>
}
