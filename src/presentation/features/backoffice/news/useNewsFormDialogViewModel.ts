import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ClubNews } from '@domain/entities/club-news'
import type { CreatableClubNewsStatus } from '@domain/usecases/news/CreateClubNewsUseCase'
import { useNewsDependencies } from '@presentation/di/hooks/use-news-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { combineDateAndTime, toDateInputValue } from '@presentation/shared/formatters/date-input'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export type NewsFormMode = 'create' | 'edit'

export interface NewsFormValues {
  title: string
  details: string
  // 2026-09-17 developer decision (resolves PO-WA-02): the dialog now
  // offers a status selector — 'draft' or 'published' only. 'archived' is
  // reached exclusively through the dedicated "Supprimer" action
  // (useBackofficeNewsViewModel's archive mutation), never through this
  // select.
  status: CreatableClubNewsStatus
  publishedAt: string // yyyy-mm-dd, native <input type="date"> value — may be '' when status is 'draft'
  expiresAt: string // yyyy-mm-dd or '' (optional)
  link: string // free text or '' (optional)
}

const EMPTY_VALUES: NewsFormValues = {
  title: '',
  details: '',
  status: 'published',
  publishedAt: '',
  expiresAt: '',
  link: '',
}

function toFormValues(news: ClubNews | null): NewsFormValues {
  if (!news) return EMPTY_VALUES
  return {
    title: news.title,
    details: news.details,
    // NewsTable no longer opens this dialog for an 'archived' row (2026-09-17
    // decision, see NewsTable.tsx) — the 'draft' fallback below is dead code
    // kept only because TypeScript can't narrow news.status past ClubNews's
    // own type here; it should never actually run.
    status: news.status === 'draft' || news.status === 'published' ? news.status : 'draft',
    publishedAt: news.publishedAt ? toDateInputValue(new Date(news.publishedAt)) : '',
    expiresAt: news.expiresAt ? toDateInputValue(new Date(news.expiresAt)) : '',
    link: news.link ?? '',
  }
}

interface UseNewsFormDialogViewModelParams {
  mode: NewsFormMode
  // null in 'create' mode; the row being edited in 'edit' mode.
  news: ClubNews | null
  onSuccess: () => void
}

// specs/web-actus.md UI design, "Nouveau composant — dialogue de
// création/modification (NewsFormDialog)": one hook backs BOTH dialog
// titles the mockups show — the caller (NewsFormDialog) is remounted with a
// `key` that changes between "create" and the edited row's id, so this
// hook's own `useState(() => toFormValues(news))` initializer runs exactly
// once per dialog opening — no useEffect-driven reset that could clobber a
// half-typed form on an unrelated parent re-render.
export function useNewsFormDialogViewModel({ mode, news, onSuccess }: UseNewsFormDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { createClubNewsUseCase, updateClubNewsUseCase } = useNewsDependencies()

  const [values, setValues] = useState<NewsFormValues>(() => toFormValues(news))

  function setField<K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session — but keeps the mutationFn total
        // rather than calling a use case with an empty actorId.
        throw new Error('No authenticated admin session.')
      }

      // A draft may have no publish date yet (mirrors
      // club_news_published_has_date, which only constrains 'published'
      // rows) — only convert to ISO when a date was actually entered.
      const publishedAt = values.publishedAt ? combineDateAndTime(values.publishedAt, '00:00') : null
      const expiresAt = values.expiresAt ? combineDateAndTime(values.expiresAt, '00:00') : null
      const link = values.link.trim() || null

      if (mode === 'create') {
        return createClubNewsUseCase.execute({
          actorId: user.id,
          title: values.title,
          details: values.details,
          link,
          status: values.status,
          publishedAt,
          expiresAt,
        })
      }

      // mode === 'edit': `news` is guaranteed non-null by NewsFormDialog's
      // own prop typing (edit mode always carries the row being edited).
      return updateClubNewsUseCase.execute({
        actorId: user.id,
        newsId: news!.id,
        title: values.title,
        details: values.details,
        link,
        status: values.status,
        publishedAt,
        expiresAt,
      })
    },
    onSuccess: () => {
      // AC-WA-19 — centralized queryKey, invalidated so the list reflects
      // the change without a manual page reload.
      void queryClient.invalidateQueries({ queryKey: queryKeys.newsAdminList() })
      onSuccess()
    },
  })

  // publishedAt is only required once status is 'published' — mirrors
  // CreateClubNewsUseCase/UpdateClubNewsUseCase's own conditional check.
  const canSubmit =
    !!values.title.trim() &&
    !!values.details.trim() &&
    (values.status !== 'published' || !!values.publishedAt) &&
    !mutation.isPending

  // AC-WA-20 — on failure the dialog stays open with the typed values
  // untouched (no reset happens anywhere on error, only on the successful
  // path above) and shows a generic French message translated from the
  // DomainError, never a raw Supabase message.
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    values,
    setTitle: (value: string) => setField('title', value),
    setDetails: (value: string) => setField('details', value),
    setStatus: (value: CreatableClubNewsStatus) => setField('status', value),
    setPublishedAt: (value: string) => setField('publishedAt', value),
    setExpiresAt: (value: string) => setField('expiresAt', value),
    setLink: (value: string) => setField('link', value),

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
