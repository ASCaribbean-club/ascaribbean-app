import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ClubNews } from '@domain/entities/club-news'
import { isNewsVisible } from '@domain/policies/news-visibility'
import { useNewsDependencies } from '@presentation/di/hooks/use-news-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

export type NewsDialogState = { mode: 'create' } | { mode: 'edit'; news: ClubNews } | null

export interface NewsRow {
  news: ClubNews
  // isNewsVisible(news, now) computed ONCE here (§2.2 of specs/web-actus.md)
  // — NewsStatusBadge only ever renders this boolean, it never re-derives it.
  visible: boolean
}

// specs/web-actus.md §2.4/AC-WA-26 — listAll() is called directly through
// the DI-provided NewsRepository, the same "no wrapping use case for a
// plain passthrough read" precedent as
// useCreateConvocationViewModel's `opponentRepository.findByTeamId` call:
// there is no business rule between "admin token" and "every club_news
// row", RLS (club_news_select_admin) is the sole authority on which rows
// come back. The three WRITES (create/update/archive) go through a use
// case each, per AC-WA-10 — see useNewsFormDialogViewModel for
// create/update, this hook for archive.
export function useBackofficeNewsViewModel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { newsRepository, archiveClubNewsUseCase } = useNewsDependencies()
  const canWrite = usePermission('news:write')

  const [dialog, setDialog] = useState<NewsDialogState>(null)
  // 2026-09-17 developer decision (resolves PO-WA-06): "Supprimer" needs a
  // confirmation step (AlertDialog, same destructive-confirmation primitive
  // already vendored) — the row pending confirmation, separate from `dialog`
  // above since the two can never be open at once (the trash action isn't
  // reachable from inside the create/edit form).
  const [pendingArchive, setPendingArchive] = useState<ClubNews | null>(null)

  const newsQuery = useQuery({
    queryKey: queryKeys.newsAdminList(),
    queryFn: () => newsRepository.listAll(),
  })

  const archiveMutation = useMutation({
    mutationFn: (newsId: string) => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      return archiveClubNewsUseCase.execute({ actorId: user.id, newsId })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.newsAdminList() })
      setPendingArchive(null)
    },
  })

  const now = new Date()
  const rows: NewsRow[] = (newsQuery.data ?? []).map((news) => ({
    news,
    visible: isNewsVisible(news, now),
  }))

  return {
    isLoading: newsQuery.isLoading,
    error: newsQuery.error ? mapDomainErrorToUiError(newsQuery.error) : null,
    rows,
    canWrite,

    dialog,
    openCreateDialog: () => setDialog({ mode: 'create' }),
    openEditDialog: (news: ClubNews) => setDialog({ mode: 'edit', news }),
    closeDialog: () => setDialog(null),

    pendingArchive,
    requestArchive: (news: ClubNews) => setPendingArchive(news),
    cancelArchive: () => setPendingArchive(null),
    confirmArchive: () => pendingArchive && archiveMutation.mutate(pendingArchive.id),
    isArchiving: archiveMutation.isPending,
    archiveErrorMessage: archiveMutation.error ? mapDomainErrorToUiError(archiveMutation.error).message : null,
  }
}
