import { IconPencil } from '@tabler/icons-react'
import { Badge } from '@presentation/shared/components/ui/badge'
import { Button } from '@presentation/shared/components/ui/button'
import { cn } from '@presentation/shared/lib/utils'
import type { NewsManagementRowView } from '../useNewsManagementViewModel'
import { NEWS_CONSOLE_STATUS_BADGE } from './news-console-status'
import { NewsDetails } from './NewsDetails'

interface NewsManagementRowProps {
  row: NewsManagementRowView
  onEdit: (newsId: string) => void
}

// One entry of the Dirigeant console list (UI design §3 point 4). The whole
// row is NOT tappable: only the pencil is (single, unambiguous edit target).
// No archive / delete control exists here (AC-DH-22).
export function NewsManagementRow({ row, onEdit }: NewsManagementRowProps) {
  const badge = NEWS_CONSOLE_STATUS_BADGE[row.status]

  return (
    <article className="flex items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {row.dateLabel ? (
            <p className="m-0 text-[11.5px] font-extrabold tracking-wider text-coach-green-label">{row.dateLabel}</p>
          ) : (
            <p className="m-0 text-[11.5px] font-semibold text-white/50">Sans date</p>
          )}
          <Badge className={cn('rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide uppercase', badge.className)}>
            {badge.label}
          </Badge>
        </div>
        <h3 className="m-0 line-clamp-2 text-[16px] leading-snug font-bold text-white">{row.title}</h3>
        <NewsDetails details={row.details} />
      </div>
      {row.canEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Modifier l'actu ${row.title}`}
          onClick={() => onEdit(row.id)}
          className="size-11 shrink-0 rounded-full text-white hover:bg-white/10"
        >
          <IconPencil className="size-5" aria-hidden />
        </Button>
      )}
    </article>
  )
}
