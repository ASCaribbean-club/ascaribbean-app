import { IconArrowRight } from '@tabler/icons-react'
import type { ClubNews } from '@domain/entities/club-news'
import { formatNewsDate } from '../../../shared/formatters/news-date'

interface NewsCardProps {
  news: ClubNews
}

// specs/actus.md UI design, "Nouveau composant NewsCard" — date (publishedAt
// only, never createdAt), title, full description, and an optional "En
// savoir plus" link. No card container/border (the mockup renders a plain
// vertical feed, not a bordered card grid like menu's ExternalLinkRow) — a
// bottom rule separates entries instead, added by the caller between items.
export function NewsCard({ news }: NewsCardProps) {
  return (
    <article className="flex flex-col gap-1.5">
      {news.publishedAt && (
        <p className="m-0 text-[11.5px] font-extrabold tracking-wider text-coach-green-label">
          {formatNewsDate(news.publishedAt)}
        </p>
      )}
      <h3 className="m-0 text-[16px] leading-snug font-bold text-white">{news.title}</h3>
      <p className="m-0 text-[13.5px] leading-relaxed text-white/60">{news.details}</p>

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
