import type { ClubNewsTag } from '@domain/entities/club-news'
import { NEWS_TAG_LABELS } from '@presentation/shared/formatters/news-tag'

export function NewsTagBadge({ tag }: { tag: ClubNewsTag }) {
  return (
    <span className="rounded-full bg-coach-green/20 px-3 py-1 text-[11px] font-extrabold tracking-wider text-coach-green-label uppercase">
      {NEWS_TAG_LABELS[tag]}
    </span>
  )
}
