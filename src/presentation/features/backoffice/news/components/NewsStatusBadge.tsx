import type { ClubNewsStatus } from '@domain/entities/club-news'
import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'

interface NewsStatusBadgeProps {
  status: ClubNewsStatus
  visible: boolean
}

// specs/web-actus.md UI design, "Nouveau composant NewsStatusBadge" —
// reproduces the StatusBadge pattern (convocation/components/StatusBadge.tsx):
// always a colored Badge doubled by a text label, never color alone.
// `visible` is the ALREADY-COMPUTED result of isNewsVisible(news, now)
// (§2.2) — this component never re-derives it from a ClubNews row itself
// for the Active/Expirée distinction, so there's exactly one place in the
// codebase deciding what "Active" means.
//
// 2026-09-17 amendment to PO-WA-03's original resolution (see spec §5/§7):
// that resolution assumed no applicative path could ever produce a 'draft'
// row, which a same-day, later decision invalidated by giving the create
// dialog a real status selector (NewsFormDialog). A 'draft' is no longer a
// SQL-editor-only oddity, so it now gets its own label instead of collapsing
// into "Expirée" — 'archived' still does, there's no dialog path back out of
// it other than editing the row (§2.3/NewsTable), so "Expirée" stays an
// accurate description for it.
export function NewsStatusBadge({ status, visible }: NewsStatusBadgeProps) {
  if (status === 'draft') {
    return (
      <Badge className="rounded-full border-border bg-muted px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-muted-foreground uppercase">
        Brouillon
      </Badge>
    )
  }

  return (
    <Badge
      className={cn(
        'rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide uppercase',
        visible
          ? 'border-coach-green/35 bg-coach-green/15 text-coach-green-text'
          : 'border-coach-red/35 bg-coach-red/15 text-coach-red-text',
      )}
    >
      {visible ? 'Active' : 'Expirée'}
    </Badge>
  )
}
