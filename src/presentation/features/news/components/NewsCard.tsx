import { IconArrowUpRight } from '@tabler/icons-react'
import type { ClubNews } from '@domain/entities/club-news'
import { formatNewsDate } from '@presentation/shared/formatters/news-date'
import { NewsDetails } from './NewsDetails'
import { NewsTagBadge } from './NewsTagBadge'

interface NewsCardProps {
  news: ClubNews
}

// docs/designs/actus v2 — date + tag badge, title, description, then (only
// when the item has a link) a thin rule and a footer with the ↗ "Lire la
// suite" action on the right. The full-width band between cards is added by
// the caller (NewsFeed), not here.
export function NewsCard({ news }: NewsCardProps) {
  return (
    <article className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {news.publishedAt && (
          <p className="m-0 text-[12px] font-extrabold tracking-wider text-coach-green-label">
            {formatNewsDate(news.publishedAt)}
          </p>
        )}
        {news.tag && <NewsTagBadge tag={news.tag} />}
      </div>
      <h3 className="m-0 text-[18px] leading-snug font-extrabold text-white">{news.title}</h3>
      <NewsDetails details={news.details} className="text-[14px] text-white/80" />

      {/* link is nullable — its absence is the normal state for a news item
          with no external destination (specs/actus.md §7): no footer at all,
          not a disabled icon. */}
      {news.link && (
        <div className="mt-1 flex justify-end border-t border-white/10">
          <a
            href={news.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Lire la suite : ${news.title}`}
            className="flex h-12 w-11 items-center justify-center text-white/60 hover:text-white"
          >
            <IconArrowUpRight className="size-6" aria-hidden />
          </a>
        </div>
      )}
    </article>
  )
}
