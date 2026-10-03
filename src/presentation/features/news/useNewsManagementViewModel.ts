import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ClubNewsStatus } from '@domain/entities/club-news'
import { can } from '@domain/policies/can'
import {
  getNewsConsoleStatus,
  matchesNewsStatusFilter,
  type NewsConsoleStatus,
  type NewsStatusFilter,
} from '@domain/policies/news-management-rules'
import { useNewsDependencies } from '@presentation/di/hooks/use-news-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { formatNewsDate } from '@presentation/shared/formatters/news-date'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { useNow } from '@presentation/shared/hooks/use-now'
import { queryKeys } from '@presentation/shared/query-keys'

export interface NewsManagementRowView {
  id: string
  title: string
  details: string
  // publishedAt only, never createdAt; null for a draft with no date yet.
  dateLabel: string | null
  status: NewsConsoleStatus
  // Per-row boolean (PO-DH-14), the pencil is absent — not greyed — when false.
  canEdit: boolean
}

// State passed back by the editor after a successful save, to confirm the
// save when the new row does not match the active status filter.
interface NewsSavedRouteState {
  savedNewsStatus?: Extract<ClubNewsStatus, 'draft' | 'published'>
}

// specs/mobile-dirigeant-habilite.md §1.3 — the Dirigeant's mobile console.
export function useNewsManagementViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const now = useNow()
  const { isOfficerView } = useActiveRole()
  const { listManageableNewsUseCase } = useNewsDependencies()

  const [statusFilter, setStatusFilter] = useState<NewsStatusFilter>('all')
  const [areFiltersVisible, setAreFiltersVisible] = useState(false)

  const newsQuery = useQuery({
    queryKey: queryKeys.newsManageList(),
    queryFn: () => listManageableNewsUseCase.execute(),
    enabled: isOfficerView,
  })

  const canCreateNews = !!user && isOfficerView && can(user, 'news:create')
  const canUpdateNews = !!user && isOfficerView && can(user, 'news:update')

  const rows: NewsManagementRowView[] = (newsQuery.data ?? [])
    .filter((news) => matchesNewsStatusFilter(news, statusFilter))
    .map((news) => ({
      id: news.id,
      title: news.title,
      details: news.details,
      dateLabel: news.publishedAt ? formatNewsDate(news.publishedAt) : null,
      status: getNewsConsoleStatus(news, now),
      canEdit: canUpdateNews,
    }))

  const savedStatus = (location.state as NewsSavedRouteState | null)?.savedNewsStatus
  const savedStatusDoesNotMatchFilter = savedStatus && !matchesNewsStatusFilter({ status: savedStatus }, statusFilter)
  const savedNotice = savedStatusDoesNotMatchFilter
    ? savedStatus === 'draft'
      ? 'Actu enregistrée en brouillon'
      : 'Actu enregistrée et publiée'
    : null

  return {
    isLoading: newsQuery.isLoading,
    error: newsQuery.error ? mapDomainErrorToUiError(newsQuery.error) : null,
    retry: () => void newsQuery.refetch(),

    statusFilter,
    isFilterActive: statusFilter !== 'all',
    areFiltersVisible,
    toggleFilters: () => setAreFiltersVisible((current) => !current),
    // A re-tap on the active item yields '' — ignored ("Toutes" is the neutral state).
    onChangeStatusFilter: (value: string) => {
      if (value === 'all' || value === 'draft' || value === 'published') setStatusFilter(value)
    },

    rows,
    emptyLabel:
      statusFilter === 'draft' ? 'Aucun brouillon' : statusFilter === 'published' ? 'Aucune actu publiée' : 'Aucune actu pour le moment',
    savedNotice,

    canCreateNews,
    openCreate: () => navigate('/actus/new'),
    openEdit: (newsId: string) => navigate(`/actus/${newsId}/edit`),
  }
}
