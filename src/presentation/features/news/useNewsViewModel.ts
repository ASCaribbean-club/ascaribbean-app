import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { matchesNewsTagFilter, type NewsTagFilter } from '@domain/policies/news-visibility'
import { queryKeys } from '../../shared/query-keys'
import { useNewsDependencies } from '../../di/hooks/use-news-dependencies'

// specs/actus.md UI design — identical feed for every role, no team/section/
// season scope, so no user/role input to this query at all (queryKeys.newsFeed
// has no discriminant either). The tag filter is applied client-side on the
// already-fetched list: no extra request per chip.
export function useNewsViewModel() {
  const { listPublishedNewsUseCase } = useNewsDependencies()
  const [tagFilter, setTagFilter] = useState<NewsTagFilter>('all')
  // Hidden by default to save vertical space; the toggle sits in the header.
  const [areFiltersVisible, setAreFiltersVisible] = useState(false)

  const newsQuery = useQuery({
    queryKey: queryKeys.newsFeed(),
    queryFn: () => listPublishedNewsUseCase.execute(),
  })

  const allNews = newsQuery.data ?? []

  return {
    isLoading: newsQuery.isLoading,
    error: newsQuery.error,
    news: allNews.filter((news) => matchesNewsTagFilter(news, tagFilter)),
    tagFilter,
    setTagFilter,
    areFiltersVisible,
    toggleFilters: () => setAreFiltersVisible((visible) => !visible),
    isFilterActive: tagFilter !== 'all',
  }
}
