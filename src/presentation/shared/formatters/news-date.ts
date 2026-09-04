// "3 AOÛT" on a NewsCard (docs/designs/actus/[v0] Mob - Actus.png) — day +
// month spelled out, no year, no weekday (unlike formatConvocationDate).
// Uppercase is applied here rather than left to CSS `uppercase` because the
// visible text itself (e.g. copy/paste, screen readers reading raw text)
// should already read as the club's day/month shorthand, not rely on a
// text-transform the caller might drop.
export function formatNewsDate(publishedAtIso: string): string {
  const date = new Date(publishedAtIso)
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric' })
  const month = date.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase()
  return `${day} ${month}`
}
