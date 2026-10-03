import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { ClubNews } from '@domain/entities/club-news'
import type { CreatableClubNewsStatus } from '@domain/usecases/news/CreateClubNewsUseCase'
import { useNewsDependencies } from '@presentation/di/hooks/use-news-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { combineDateAndTime } from '@presentation/shared/formatters/date-input'
import { toNewsFormValues, type NewsFormValues } from '@presentation/shared/formatters/news-form-values'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

interface UseNewsEditorFormViewModelParams {
  mode: 'create' | 'edit'
  // null in 'create' mode; the row being edited in 'edit' mode.
  news: ClubNews | null
}

// One form, parameterised by mode (same as the backoffice NewsFormDialog).
// Validation is the domain's (Create/UpdateClubNewsUseCase); `canSubmit` only
// mirrors it to enable the button. On failure the typed values are kept and a
// French message is shown, never a raw Supabase message (AC-DH-23).
export function useNewsEditorFormViewModel({ mode, news }: UseNewsEditorFormViewModelParams) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { createClubNewsUseCase, updateClubNewsUseCase } = useNewsDependencies()

  const [initialValues] = useState<NewsFormValues>(() => toNewsFormValues(news))
  const [values, setValues] = useState<NewsFormValues>(initialValues)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)

  function setField<K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        throw new Error('No authenticated session.')
      }
      // A draft may have no publish date yet (club_news_published_has_date).
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
      // Edit updates the SAME row (AC-DH-23).
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
      // AC-DH-23: the Dirigeant list and the members' feed are both refreshed.
      void queryClient.invalidateQueries({ queryKey: queryKeys.newsManageList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.newsFeed() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.newsAdminList() })
      navigate('/actus', { replace: true, state: { savedNewsStatus: values.status } })
    },
  })

  const canSubmit =
    !!values.title.trim() &&
    !!values.details.trim() &&
    (values.status !== 'published' || !!values.publishedAt) &&
    !mutation.isPending

  const isDirty = (Object.keys(values) as (keyof NewsFormValues)[]).some((key) => values[key] !== initialValues[key])

  return {
    values,
    setTitle: (value: string) => setField('title', value),
    setDetails: (value: string) => setField('details', value),
    setStatus: (value: CreatableClubNewsStatus) => setField('status', value),
    setPublishedAt: (value: string) => setField('publishedAt', value),
    setExpiresAt: (value: string) => setField('expiresAt', value),
    setLink: (value: string) => setField('link', value),

    isPublishedDateRequired: values.status === 'published',
    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage: mutation.error ? mapDomainErrorToUiError(mutation.error).message : null,
    submit: () => mutation.mutate(),
    submitLabel: mutation.isPending ? (mode === 'create' ? 'Création…' : 'Enregistrement…') : mode === 'create' ? 'Créer l’actu' : 'Enregistrer',

    // Back arrow: immediate when pristine, confirmation when dirty (Q-UI-05).
    onBack: () => (isDirty ? setIsDiscardDialogOpen(true) : navigate('/actus')),
    isDiscardDialogOpen,
    stayOnForm: () => setIsDiscardDialogOpen(false),
    discardChanges: () => navigate('/actus'),
  }
}
