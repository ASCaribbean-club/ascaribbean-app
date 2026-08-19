// "J-3" badge on the "Prochain match" card (specs/coach-dashboard.md UI design §2).
// Pure day-granularity countdown — not a business rule, just a display label.
export function formatCountdown(dateIso: string, now: Date): string {
  const msPerDay = 24 * 60 * 60 * 1000
  const target = new Date(dateIso)
  const dayDiff = Math.ceil((target.getTime() - now.getTime()) / msPerDay)
  if (dayDiff <= 0) return 'Aujourd\'hui'
  return `J-${dayDiff}`
}
