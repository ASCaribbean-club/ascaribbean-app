import { useEffect, useRef } from 'react'
import type { ClubNews } from '@domain/entities/club-news'
import { DateTimeInput } from '@presentation/features/convocation/components/DateTimeInput'
import { FIELD_CLASSNAME, FIELD_ROW_CLASSNAME } from '@presentation/features/convocation/components/field-style'
import { FormField } from '@presentation/features/convocation/components/FormField'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Input } from '@presentation/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { Textarea } from '@presentation/shared/components/ui/textarea'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { useNewsEditorFormViewModel } from '../useNewsEditorFormViewModel'
import { NewsDiscardDialog } from './NewsDiscardDialog'

interface NewsEditorFormProps {
  mode: 'create' | 'edit'
  title: string
  news: ClubNews | null
}

// 'archived' is deliberately absent: the officer can never archive.
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publiée' },
] as const

// Mounted with a `key` by the page so the initial values are computed once
// per target (no useEffect-driven reset that could clobber typed input).
export function NewsEditorForm({ mode, title, news }: NewsEditorFormProps) {
  const vm = useNewsEditorFormViewModel({ mode, news })
  const errorRef = useRef<HTMLDivElement>(null)

  // Bring a save error into view under the sticky header (inputs are kept).
  useEffect(() => {
    if (vm.errorMessage) errorRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [vm.errorMessage])

  return (
    <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
      <BackHeader title={title} onBack={vm.onBack} />

      <form
        className="flex flex-1 flex-col gap-5 px-5.5 pt-5.5 pb-28"
        onSubmit={(event) => {
          event.preventDefault()
          if (vm.canSubmit) vm.submit()
        }}
      >
        {vm.errorMessage && (
          <div ref={errorRef}>
            <Alert variant="destructive" role="alert">
              <AlertDescription>{vm.errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        <FormField label="Titre" htmlFor="news-title">
          <Input
            id="news-title"
            value={vm.values.title}
            onChange={(event) => vm.setTitle(event.target.value)}
            disabled={vm.isSubmitting}
            placeholder="Ex. Reprise des entraînements"
            className={FIELD_CLASSNAME}
          />
        </FormField>

        <FormField label="Contenu" htmlFor="news-details">
          <Textarea
            id="news-details"
            rows={6}
            value={vm.values.details}
            onChange={(event) => vm.setDetails(event.target.value)}
            disabled={vm.isSubmitting}
            placeholder="Ex. Tous les groupes reprennent le 2 septembre"
            className="resize-none rounded-xl border-white/12 bg-white/5 text-base text-white placeholder:text-white/35"
          />
        </FormField>

        <FormField label="Statut" htmlFor="news-status">
          <Select
            value={vm.values.status}
            onValueChange={(value) => vm.setStatus(value as typeof vm.values.status)}
            disabled={vm.isSubmitting}
          >
            <SelectTrigger id="news-status" className={FIELD_CLASSNAME}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <div className="flex flex-col gap-2">
          <div className={FIELD_ROW_CLASSNAME}>
            <FormField label={vm.isPublishedDateRequired ? 'Publication *' : 'Publication'} htmlFor="news-published-at">
              <DateTimeInput id="news-published-at" type="date" value={vm.values.publishedAt} onChange={vm.setPublishedAt} />
            </FormField>
            <FormField label="Expiration (optionnel)" htmlFor="news-expires-at">
              <DateTimeInput id="news-expires-at" type="date" value={vm.values.expiresAt} onChange={vm.setExpiresAt} />
            </FormField>
          </div>
          {!vm.isPublishedDateRequired && <p className="text-[12px] text-white/60">Facultative pour un brouillon</p>}
        </div>

        <FormField label="Lien (optionnel)" htmlFor="news-link">
          <Input
            id="news-link"
            type="url"
            inputMode="url"
            value={vm.values.link}
            onChange={(event) => vm.setLink(event.target.value)}
            disabled={vm.isSubmitting}
            placeholder="https://..."
            className={FIELD_CLASSNAME}
          />
        </FormField>
      </form>

      <div className="sticky bottom-0 bg-gradient-to-t from-coach-bg via-coach-bg to-transparent px-5.5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          onClick={vm.submit}
          disabled={!vm.canSubmit}
          className="h-11 w-full rounded-full bg-white text-[15px] font-extrabold text-black hover:bg-white/90 disabled:opacity-40"
        >
          {vm.submitLabel}
        </Button>
      </div>

      <NewsDiscardDialog open={vm.isDiscardDialogOpen} onStay={vm.stayOnForm} onDiscard={vm.discardChanges} />
    </div>
  )
}
