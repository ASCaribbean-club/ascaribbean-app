import { formatNewsDate } from './news-date'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

// "aujourd'hui" / "hier" / "il y a 3 j", then the plain date from a week on.
// Day granularity on purpose: publishedAt is stored as a date (00:00), so an
// "il y a 1 h" would be invented precision. `now` is passed in to stay testable.
export function formatNewsRelativeDate(publishedAtIso: string, now: Date): string {
  const publishedAt = new Date(publishedAtIso)
  const days = Math.round((startOfDay(now) - startOfDay(publishedAt)) / MS_PER_DAY)

  if (days <= 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  return formatNewsDate(publishedAtIso).toLowerCase()
}
