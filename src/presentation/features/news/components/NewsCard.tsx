import { useLayoutEffect, useRef, useState } from 'react'
import { IconArrowRight } from '@tabler/icons-react'
import type { ClubNews } from '@domain/entities/club-news'
import { formatNewsDate } from '@presentation/shared/formatters/news-date'
import { cn } from '@presentation/shared/lib/utils'

interface NewsCardProps {
  news: ClubNews
}

// specs/actus.md UI design, "Nouveau composant NewsCard" — date (publishedAt
// only, never createdAt), title, full description, and an optional "En
// savoir plus" link. No card container/border (the mockup renders a plain
// vertical feed, not a bordered card grid like menu's ExternalLinkRow) — a
// bottom rule separates entries instead, added by the caller between items.
export function NewsCard({ news }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isClampable, setIsClampable] = useState(false)
  const detailsRef = useRef<HTMLParagraphElement>(null)

  // Measured while clamped: scrollHeight > clientHeight means more than 3
  // lines. Once expanded the text no longer overflows, so keep the last
  // answer instead of re-measuring (otherwise "Voir moins" would vanish).
  useLayoutEffect(() => {
    const el = detailsRef.current
    if (el && !expanded) setIsClampable(el.scrollHeight > el.clientHeight + 1)
  }, [news.details, expanded])

  return (
    <article className="flex flex-col gap-1.5">
      {news.publishedAt && (
        <p className="m-0 text-[11.5px] font-extrabold tracking-wider text-coach-green-label">
          {formatNewsDate(news.publishedAt)}
        </p>
      )}
      <h3 className="m-0 text-[16px] leading-snug font-bold text-white">{news.title}</h3>
      {/* whitespace-pre-wrap keeps the line breaks and runs of spaces the author typed. Clamped to
          3 lines until tapped; the toggle only exists when the text really
          overflows, so short news stay a plain paragraph. */}
      <p
        ref={detailsRef}
        className={cn(
          'm-0 text-[13.5px] leading-relaxed whitespace-pre-wrap text-white/60',
          !expanded && 'line-clamp-3',
          isClampable && 'cursor-pointer',
        )}
        onClick={isClampable ? () => setExpanded((v) => !v) : undefined}
      >
        {news.details}
      </p>
      {isClampable && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="-my-2 flex h-11 w-fit items-center text-[13px] font-bold text-coach-green-link"
        >
          {expanded ? 'Voir moins' : 'Voir plus'}
        </button>
      )}

      {/* link is nullable — its absence is the normal state for a news item
          with no external destination (specs/actus.md §7), not an error or
          a disabled button. */}
      {news.link && (
        <a
          href={news.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex h-6 w-fit items-center gap-1.5 text-[13px] font-bold text-coach-green-link"
        >
          En savoir plus
          <IconArrowRight className="size-4" />
        </a>
      )}
    </article>
  )
}
