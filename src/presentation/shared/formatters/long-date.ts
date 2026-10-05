// "12/09/2026" from a date-only ISO string (yyyy-mm-dd). Built from
// its parts in local time, never `new Date('2026-09-12')` (parsed as UTC,
// which can shift the day). Pure fr-FR display formatting.
export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric', year: 'numeric' })
}
