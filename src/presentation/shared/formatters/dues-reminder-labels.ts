import { calendarDaysSince, nextReminderAt } from '@domain/rules/dues-reminder-rules'

// specs/mobile-treasurer.md amendement (4), §B "Libellé d'état" — pure French
// wording of the reminder history, in calendar days of the device's local
// time. The rules (7-day window, eligibility) stay in domain/rules/.

// 0 → "aujourd'hui", 1 → "hier", n → "il y a {n} j".
export function formatReminderAge(days: number): string {
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} j`
}

// "Jamais relancé" or "{n} relance(s) · dernière {quand}".
export function formatReminderState(count: number, lastRemindedAt: string | null, now: Date): string {
  if (count <= 0 || lastRemindedAt === null) return 'Jamais relancé'
  const noun = count === 1 ? 'relance' : 'relances'
  return `${count} ${noun} · dernière ${formatReminderAge(calendarDaysSince(lastRemindedAt, now))}`
}

// Short day + month, e.g. "14 oct.".
export function formatShortDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Replaces the "Relancer" button during the 7-day window — a state, not a
// disabled control: "Relancé il y a {n} j · prochaine relance le {date}".
export function formatCooldownNotice(lastRemindedAt: string, now: Date): string {
  const age = formatReminderAge(calendarDaysSince(lastRemindedAt, now))
  return `Relancé ${age} · prochaine relance le ${formatShortDate(nextReminderAt(lastRemindedAt))}`
}

// "5 octobre 2026" — the date of the last reminder on the member banner
// ("Rappel du {date longue}").
export function formatLongReminderDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
