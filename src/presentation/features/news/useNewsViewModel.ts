import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../shared/query-keys'
import { useNewsDependencies } from '../../di/hooks/use-news-dependencies'

// specs/actus.md UI design — identical feed for every role, no team/section/
// season scope, so no user/role input to this query at all (queryKeys.newsFeed
// has no discriminant either).
export function useNewsViewModel() {
  const { listPublishedNewsUseCase } = useNewsDependencies()

  const newsQuery = useQuery({
    queryKey: queryKeys.newsFeed(),
    queryFn: () => listPublishedNewsUseCase.execute(),
  })

  return {
    isLoading: newsQuery.isLoading,
    error: newsQuery.error,
    news: newsQuery.data ?? [],
  }
}
