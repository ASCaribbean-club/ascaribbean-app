import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { matchesNewsFeedFilter, type NewsFeedFilter } from '@domain/policies/news-visibility'
import { useObservability } from '@presentation/di/hooks/use-observability'
import { queryKeys } from '../../shared/query-keys'
import { useAuth } from '../../shared/hooks/use-auth'
import { useNewsDependencies } from '../../di/hooks/use-news-dependencies'

// specs/actus.md UI design — identical feed for every role, no team/section/
// season scope, so no user/role input to the feed query (queryKeys.newsFeed
// has no discriminant either). Favorites are the one per-member piece: a
// second query keyed by user. The filter is applied client-side on the
// already-fetched lists: no extra request per chip.
export function useNewsViewModel() {
  const { user } = useAuth()
  const observability = useObservability()
  const queryClient = useQueryClient()
  const { listPublishedNewsUseCase, listNewsFavoriteIdsUseCase, setNewsFavoriteUseCase } = useNewsDependencies()
  const [filter, setFilter] = useState<NewsFeedFilter>('all')
  // Hidden by default to save vertical space; the toggle sits in the header.
  const [areFiltersVisible, setAreFiltersVisible] = useState(false)
  const userId = user?.id ?? ''

  const newsQuery = useQuery({
    queryKey: queryKeys.newsFeed(),
    queryFn: () => listPublishedNewsUseCase.execute(),
  })

  const favoritesKey = queryKeys.newsFavorites(userId)
  const favoritesQuery = useQuery({
    queryKey: favoritesKey,
    queryFn: () => listNewsFavoriteIdsUseCase.execute(userId),
    enabled: !!userId,
  })

  const favoriteIds = new Set(favoritesQuery.data ?? [])

  // Optimistic: the star flips immediately, rolled back if the write fails.
  const toggleFavoriteMutation = useMutation({
    mutationFn: (variables: { newsId: string; isFavorite: boolean }) =>
      setNewsFavoriteUseCase.execute({ userId, ...variables }),
    onMutate: async ({ newsId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: favoritesKey })
      const previous = queryClient.getQueryData<string[]>(favoritesKey)
      const others = (previous ?? []).filter((id) => id !== newsId)
      queryClient.setQueryData<string[]>(favoritesKey, isFavorite ? [...others, newsId] : others)
      return { previous }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(favoritesKey, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKey }),
  })

  const news = (newsQuery.data ?? []).filter((item) => matchesNewsFeedFilter(item, filter, favoriteIds))

  return {
    isLoading: newsQuery.isLoading,
    error: newsQuery.error,
    news,
    filter,
    setFilter: (value: NewsFeedFilter) => {
      setFilter(value)
      observability.track({
        name: 'filter_applied',
        props: { screen: 'news', filter: value === 'favorites' ? 'favorites' : 'tag', active: value !== 'all' },
      })
    },
    onOpenLink: () => observability.track({ name: 'external_link_opened', props: { target: 'news_link' } }),
    areFiltersVisible,
    toggleFilters: () => setAreFiltersVisible((visible) => !visible),
    isFilterActive: filter !== 'all',
    isFavorite: (newsId: string) => favoriteIds.has(newsId),
    toggleFavorite: (newsId: string) =>
      toggleFavoriteMutation.mutate({ newsId, isFavorite: !favoriteIds.has(newsId) }),
    emptyMessage: filter === 'favorites' ? 'Aucun favori pour le moment' : 'Aucune actu pour le moment',
  }
}
