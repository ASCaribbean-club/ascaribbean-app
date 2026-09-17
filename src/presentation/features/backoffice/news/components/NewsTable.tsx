import { IconPencil, IconTrash } from '@tabler/icons-react'
import type { ClubNews } from '@domain/entities/club-news'
import { Button } from '@presentation/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import { toDateInputValue } from '@presentation/shared/formatters/date-input'
import type { NewsRow } from '../useBackofficeNewsViewModel'
import { NewsStatusBadge } from './NewsStatusBadge'

interface NewsTableProps {
  rows: NewsRow[]
  canWrite: boolean
  onEdit: (news: ClubNews) => void
  // 2026-09-17 developer decision (resolves PO-WA-06) — opens
  // ArchiveNewsDialog's confirmation step, doesn't archive directly.
  onDelete: (news: ClubNews) => void
}

// specs/web-actus.md UI design, "Écran — liste (/admin/news)": six columns
// in mockup order (TITRE, CONTENU, DATE, EXPIRATION, LIEN, STATUT) plus an
// edit action column — sticky header (top-16, under BackofficeTopBar's own
// sticky h-16), opaque background so scrolling rows don't show through.
// z-index kept BELOW BackofficeTopBar's z-10 (spec: "z-index inférieur à
// celui de BackofficeTopBar pour que les deux se superposent dans le bon
// ordre") — both were previously z-10, which let them tie/overlap on scroll.
export function NewsTable({ rows, canWrite, onEdit, onDelete }: NewsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titre</TableHead>
          <TableHead>Contenu</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Expiration</TableHead>
          <TableHead>Lien</TableHead>
          <TableHead>Statut</TableHead>
          {/* AC-WA-14 — no visible label in the mockup for this column, but
              the sr-only text lives on an inner <span>, not the <th> itself:
              sr-only sets `position: absolute`, which on the <th> directly
              would collapse that cell out of the table's column layout and
              misalign every row's last column against this header. */}
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ news, visible }) => (
          <TableRow key={news.id}>
            <TableCell className="font-semibold whitespace-normal">{news.title}</TableCell>
            {/* AC-WA-15 corollary — details can be long free text (§2.3):
                truncated to one line, full text available on hover via the
                native title attribute, and in full inside the edit dialog. */}
            <TableCell className="max-w-64 truncate" title={news.details}>
              {news.details}
            </TableCell>
            {/* AC-WA-15 — published_at, NEVER created_at. */}
            <TableCell>{news.publishedAt ? toDateInputValue(new Date(news.publishedAt)) : '—'}</TableCell>
            <TableCell className="text-muted-foreground">
              {news.expiresAt ? toDateInputValue(new Date(news.expiresAt)) : '—'}
            </TableCell>
            <TableCell>
              {news.link ? (
                <a
                  href={news.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-coach-green-link underline-offset-2 hover:underline"
                >
                  Voir le lien
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <NewsStatusBadge status={news.status} visible={visible} />
            </TableCell>
            <TableCell>
              {canWrite && (
                <div className="flex items-center gap-1">
                  {/* 2026-09-17 developer decision, amends the earlier
                      "un-archive via edit" call: an archived row is a
                      terminal state, not editable at all — no pencil, same
                      as the trash icon below. There is now no UI path back
                      out of 'archived' (see the matching dead-branch note in
                      useNewsFormDialogViewModel's toFormValues). */}
                  {news.status !== 'archived' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Modifier « ${news.title} »`}
                      onClick={() => onEdit(news)}
                      className="h-11 w-11 rounded-full"
                    >
                      <IconPencil className="size-4" aria-hidden />
                    </Button>
                  )}
                  {/* 2026-09-17 developer decision (resolves PO-WA-06) —
                      hidden once already archived: nothing left to "delete"
                      a second time. */}
                  {news.status !== 'archived' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Supprimer « ${news.title} »`}
                      onClick={() => onDelete(news)}
                      className="h-11 w-11 rounded-full text-destructive hover:text-destructive"
                    >
                      <IconTrash className="size-4" aria-hidden />
                    </Button>
                  )}
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
