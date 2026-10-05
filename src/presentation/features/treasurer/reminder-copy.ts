// Pure wording of the reminder confirmation and result messages —
// specs/mobile-treasurer.md amendement UI du 2026-10-05 (4), (a) points 5 and 6.

// "Relancer {nom} ?" for one named card, else "Relancer {k} licencié(s) ?".
export function buildReminderConfirmTitle(count: number, name?: string): string {
  if (count === 1 && name) return `Relancer ${name} ?`
  return `Relancer ${count} licencié${count > 1 ? 's' : ''} ?`
}

export const REMINDER_CONFIRM_BODY = "Chacun verra un rappel de cotisation dans l'application."

export const REMINDER_SEND_ERROR = "Aucune relance n'a été envoyée. Réessayez."

const NOT_SENT_REASON = 'déjà relancé(s) il y a moins de 7 jours ou soldé(s) entre-temps'

export interface ReminderFeedback {
  // 'success' = something was sent; 'neutral' = nothing was.
  tone: 'success' | 'neutral'
  lines: string[]
  // 5 s when a "non envoyée(s)" line is present (two lines to read), else 3 s.
  durationMs: number
}

export function buildReminderFeedback(sentCount: number, notSentCount: number): ReminderFeedback {
  const sentLine = `${sentCount} ${sentCount > 1 ? 'relances envoyées' : 'relance envoyée'}`
  if (sentCount === 0) {
    return { tone: 'neutral', lines: [`Aucune relance envoyée : ${NOT_SENT_REASON}`], durationMs: 5000 }
  }
  if (notSentCount === 0) {
    return { tone: 'success', lines: [sentLine], durationMs: 3000 }
  }
  return { tone: 'success', lines: [sentLine, `${notSentCount} non envoyée(s) : ${NOT_SENT_REASON}`], durationMs: 5000 }
}
