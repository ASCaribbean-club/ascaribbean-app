import { useEffect, useRef } from 'react'
import type { ClubNews } from '@domain/entities/club-news'
import type { NewsFormValues } from '@presentation/shared/formatters/news-form-values'
import { DateTimeInput } from '@presentation/features/convocation/components/DateTimeInput'
import { FIELD_CLASSNAME, FIELD_ROW_CLASSNAME } from '@presentation/features/convocation/components/field-style'
import { FormField } from '@presentation/features/convocation/components/FormField'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Input } from '@presentation/shared/components/ui/input'
import { Textarea } from '@presentation/shared/components/ui/textarea'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { NEWS_TAG_LABELS } from '@presentation/shared/formatters/news-tag'
import { cn } from '@presentation/shared/lib/utils'
import { useNewsEditorFormViewModel } from '../useNewsEditorFormViewModel'
import { NewsDiscardDialog } from './NewsDiscardDialog'

interface NewsEditorFormProps {
  mode: 'create' | 'edit'
  title: string
  news: ClubNews | null
}

// docs/designs/actus/v3 — tag picked from 2x2 cards. "Aucun" stays selectable:
// an untagged news item is a normal state (only shown under "Tout").
const TAG_OPTIONS: { value: NewsFormValues['tag']; label: string; hint: string }[] = [
  { value: 'club', label: NEWS_TAG_LABELS.club, hint: 'Info du club' },
  { value: 'equipes', label: NEWS_TAG_LABELS.equipes, hint: 'Résultats, classement' },
  { value: 'boutique', label: NEWS_TAG_LABELS.boutique, hint: 'Maillots, équipement' },
  { value: '', label: 'Aucun', hint: 'Sans catégorie' },
]

const SECTION_LABEL_CLASSNAME = 'text-[13px] font-extrabold tracking-wider text-white/50 uppercase'

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
          if (vm.canSubmit) vm.publish()
        }}
      >
        {vm.errorMessage && (
          <div ref={errorRef}>
            <Alert variant="destructive" role="alert">
              <AlertDescription>{vm.errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        <div role="group" aria-labelledby="news-tag-label" className="flex flex-col gap-2">
          <p id="news-tag-label" className={SECTION_LABEL_CLASSNAME}>
            Type
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TAG_OPTIONS.map((option) => (
              <button
                key={option.value || 'none'}
                type="button"
                aria-pressed={vm.values.tag === option.value}
                disabled={vm.isSubmitting}
                onClick={() => vm.setTag(option.value)}
                className={cn(
                  'flex min-h-16 min-w-0 flex-col items-start justify-center gap-0.5 rounded-2xl border px-4 py-3 text-left',
                  vm.values.tag === option.value
                    ? 'border-coach-green bg-coach-green/15'
                    : 'border-white/12 bg-white/5 hover:bg-white/10',
                )}
              >
                <span className="text-[15px] font-extrabold text-white">{option.label}</span>
                <span className="text-[13px] text-white/50">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <FormField label="Titre" htmlFor="news-title">
          <Input
            id="news-title"
            value={vm.values.title}
            onChange={(event) => vm.setTitle(event.target.value)}
            disabled={vm.isSubmitting}
            placeholder="Ex. Reprise des entraînements"
            className={cn(FIELD_CLASSNAME, 'rounded-xl text-base font-bold')}
          />
        </FormField>

        <FormField label="Message" htmlFor="news-details">
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

        {/* Photo upload comes in a second pass (storage + RLS): the frame is in
            place per the design but inert. */}
        <button
          type="button"
          disabled
          className="flex h-28 w-full items-center justify-center rounded-2xl border border-dashed border-white/20 text-[15px] font-bold text-white/40"
        >
          + Ajouter une photo · bientôt
        </button>

        <div className="flex flex-col gap-2">
          <div className={FIELD_ROW_CLASSNAME}>
            <FormField label="Publication" htmlFor="news-published-at">
              <DateTimeInput id="news-published-at" type="date" value={vm.values.publishedAt} onChange={vm.setPublishedAt} />
            </FormField>
            <FormField label="Expiration (optionnel)" htmlFor="news-expires-at">
              <DateTimeInput id="news-expires-at" type="date" value={vm.values.expiresAt} onChange={vm.setExpiresAt} />
            </FormField>
          </div>
          <p className="text-[12px] text-white/60">Par défaut : aujourd’hui à la publication</p>
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
        <div className="flex gap-3">
          {vm.canSaveDraft && (
            <Button
              type="button"
              variant="outline"
              onClick={vm.saveDraft}
              disabled={!vm.canSubmit}
              className="h-12 flex-1 rounded-full border-white/20 bg-transparent text-[15px] font-extrabold text-white hover:bg-white/10 disabled:opacity-40"
            >
              Brouillon
            </Button>
          )}
          <Button
            type="button"
            onClick={vm.publish}
            disabled={!vm.canSubmit}
            className="h-12 flex-[1.5] rounded-full bg-coach-green-link text-[15px] font-extrabold text-black hover:bg-coach-green-link/90 disabled:opacity-40"
          >
            {vm.publishLabel}
          </Button>
        </div>
      </div>

      <NewsDiscardDialog open={vm.isDiscardDialogOpen} onStay={vm.stayOnForm} onDiscard={vm.discardChanges} />
    </div>
  )
}
