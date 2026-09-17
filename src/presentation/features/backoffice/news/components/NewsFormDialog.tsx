import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { Textarea } from '@presentation/shared/components/ui/textarea'
import type { NewsDialogState } from '../useBackofficeNewsViewModel'
import { useNewsFormDialogViewModel } from '../useNewsFormDialogViewModel'

// 2026-09-17 developer decision (resolves PO-WA-02) — draft is now a
// selectable status alongside published. 'archived' is deliberately absent
// here: it's reached only through the row-level "Supprimer" action.
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publiée' },
] as const

interface NewsFormDialogProps {
  dialog: NewsDialogState
  onClose: () => void
}

// specs/web-actus.md UI design — one component, remounted (via `key` below)
// rather than reset by a useEffect, whenever the target row or mode
// changes. Renders nothing while closed: AC-WA-25's focus-trap/Escape-close
// behavior comes from Radix Dialog for free, only while it's actually in
// the tree.
export function NewsFormDialog({ dialog, onClose }: NewsFormDialogProps) {
  if (!dialog) return null

  return (
    <NewsFormDialogContent
      key={dialog.mode === 'edit' ? dialog.news.id : 'create'}
      dialog={dialog}
      onClose={onClose}
    />
  )
}

const DIALOG_TITLE = {
  create: 'Créer une actu',
  edit: 'Modifier l’actu',
} as const

const SUBMIT_LABEL = {
  create: 'Créer',
  edit: 'Enregistrer',
} as const

const SUBMITTING_LABEL = {
  create: 'Création…',
  edit: 'Enregistrement…',
} as const

function NewsFormDialogContent({ dialog, onClose }: NewsFormDialogProps & { dialog: NonNullable<NewsDialogState> }) {
  const news = dialog.mode === 'edit' ? dialog.news : null
  const vm = useNewsFormDialogViewModel({
    mode: dialog.mode,
    news,
    onSuccess: onClose,
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{DIALOG_TITLE[dialog.mode]}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            vm.submit()
          }}
        >
          {vm.errorMessage && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{vm.errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="news-title" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Titre
            </Label>
            <Input
              id="news-title"
              placeholder="Ex. Reprise des entraînements"
              required
              disabled={vm.isSubmitting}
              value={vm.values.title}
              onChange={(event) => vm.setTitle(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="news-details" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Contenu
            </Label>
            {/* Textarea, not Input (specs/web-actus.md "Questions UI" —
                non-blocking position): details is a free `text` column with
                no confirmed max length (PO-WA-07) — a 3-line field is more
                honest about that than a single-line input the mockup shows. */}
            <Textarea
              id="news-details"
              placeholder="Ex. Tous les groupes reprennent le 2 septembre"
              required
              disabled={vm.isSubmitting}
              value={vm.values.details}
              onChange={(event) => vm.setDetails(event.target.value)}
              rows={3}
              className="rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="news-status" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Statut
            </Label>
            <Select
              value={vm.values.status}
              onValueChange={(value) => vm.setStatus(value as typeof vm.values.status)}
              disabled={vm.isSubmitting}
            >
              <SelectTrigger id="news-status" className="h-11 rounded-xl">
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
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="news-published-at" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {/* Required only once the status above is 'published' — a
                  draft may have no publish date yet (mirrors
                  club_news_published_has_date, §2.2). */}
              Date{vm.values.status === 'published' ? '' : ' (optionnel pour un brouillon)'}
            </Label>
            <Input
              id="news-published-at"
              type="date"
              required={vm.values.status === 'published'}
              disabled={vm.isSubmitting}
              value={vm.values.publishedAt}
              onChange={(event) => vm.setPublishedAt(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="news-expires-at" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Date d’expiration (optionnel)
            </Label>
            <Input
              id="news-expires-at"
              type="date"
              disabled={vm.isSubmitting}
              value={vm.values.expiresAt}
              onChange={(event) => vm.setExpiresAt(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="news-link" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Lien (optionnel)
            </Label>
            <Input
              id="news-link"
              type="url"
              placeholder="https://..."
              disabled={vm.isSubmitting}
              value={vm.values.link}
              onChange={(event) => vm.setLink(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={vm.isSubmitting}
              onClick={onClose}
              className="h-11 rounded-full"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!vm.canSubmit}
              className="h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60"
            >
              {vm.isSubmitting ? SUBMITTING_LABEL[dialog.mode] : SUBMIT_LABEL[dialog.mode]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
