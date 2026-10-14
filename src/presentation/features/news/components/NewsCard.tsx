import { IconArrowUpRight, IconStar, IconStarFilled } from '@tabler/icons-react'
import type { ClubNews } from '@domain/entities/club-news'
import { formatNewsRelativeDate } from '@presentation/shared/formatters/news-relative-date'
import { cn } from '@presentation/shared/lib/utils'
import { NewsDetails } from './NewsDetails'
import { NewsTagBadge } from './NewsTagBadge'

interface NewsCardProps {
  news: ClubNews
  isFavorite: boolean
  onToggleFavorite: () => void
}

function formatExpiry(expiresAtIso: string): string {
  return new Date(expiresAtIso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

// docs/designs/actus v3 — relative date + tag badge, title, description, then
// a footer with ↗ "Lire la suite" (only if the item has a link) and the ☆
// favorite toggle. The design's "Vu par N membres" has no data behind it (no
// view tracking): the footer's left side shows until when the item stays
// visible instead, only if it expires. The full-width band between cards is
// added by the caller (NewsFeed), not here.
export function NewsCard({ news, isFavorite, onToggleFavorite }: NewsCardProps) {
  return (
    <article className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {news.publishedAt && (
          <p className="m-0 text-[12px] font-extrabold tracking-wider text-coach-green-label">
            {formatNewsRelativeDate(news.publishedAt, new Date()).toUpperCase()}
          </p>
        )}
        {news.tag && <NewsTagBadge tag={news.tag} />}
      </div>
      <h3 className="m-0 text-[20px] leading-snug font-extrabold text-white">{news.title}</h3>
      <NewsDetails details={news.details} className="text-[15px] text-white/70" />

      <footer className="mt-1 flex min-h-12 items-center justify-between gap-3 border-t border-white/10">
        <p className="m-0 text-[13px] text-white/50">{news.expiresAt && `Jusqu’au ${formatExpiry(news.expiresAt)}`}</p>
        <div className="flex items-center">
          {/* link is nullable — its absence is the normal state (specs/actus.md §7): no disabled icon. */}
          {news.link && (
            <a
              href={news.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Lire la suite : ${news.title}`}
              className="flex size-11 items-center justify-center text-white/60 hover:text-white"
            >
              <IconArrowUpRight className="size-6" aria-hidden />
            </a>
          )}
          <button
            type="button"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Retirer des favoris : ${news.title}` : `Ajouter aux favoris : ${news.title}`}
            onClick={onToggleFavorite}
            className={cn('flex size-11 items-center justify-center hover:text-white', isFavorite ? 'text-coach-green-link' : 'text-white/60')}
          >
            {isFavorite ? <IconStarFilled className="size-6" aria-hidden /> : <IconStar className="size-6" aria-hidden />}
          </button>
        </div>
      </footer>
    </article>
  )
}
