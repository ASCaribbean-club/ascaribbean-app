import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { can } from '@domain/policies/can'
import { useNewsDependencies } from '@presentation/di/hooks/use-news-dependencies'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

// Screen-level state of the pushed create/edit routes
// (specs/mobile-dirigeant-habilite.md §4): which mode, whether the caller may
// be here at all, and — for an edit — the row to pre-fill the form with. The
// form's own state lives in useNewsEditorFormViewModel, mounted only once the
// row is known (so its initial values are computed exactly once).
export function useNewsEditorViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { newsId } = useParams<{ newsId: string }>()
  const { isOfficerView } = useActiveRole()
  const { listManageableNewsUseCase } = useNewsDependencies()

  const mode: 'create' | 'edit' = newsId ? 'edit' : 'create'

  // UX gate only (the RLS policies are the security boundary): AC-DH-03, the
  // editor never opens outside the Dirigeant view.
  const isAllowed = !!user && isOfficerView && can(user, mode === 'edit' ? 'news:update' : 'news:create')

  // Same query (and cache entry) as the console list: an edit target is
  // looked up there instead of a dedicated findById (ARCHITECTURE.md §12.9 —
  // no method ahead of need). The use case already excludes archived rows, so
  // "archived meanwhile" and "stale link" both land on not-found.
  const newsQuery = useQuery({
    queryKey: queryKeys.newsManageList(),
    queryFn: () => listManageableNewsUseCase.execute(),
    enabled: isAllowed && mode === 'edit',
  })
  const news = mode === 'edit' ? (newsQuery.data?.find((item) => item.id === newsId) ?? null) : null

  return {
    mode,
    isAllowed,
    isLoading: mode === 'edit' && newsQuery.isLoading,
    hasLoadError: mode === 'edit' && newsQuery.isError,
    retryLoad: () => void newsQuery.refetch(),
    isNotFound: mode === 'edit' && !newsQuery.isLoading && !newsQuery.isError && news === null,
    news,
    title: mode === 'edit' ? 'Modifier l’actu' : 'Nouvelle actu',
    goBack: () => navigate('/actus'),
  }
}
