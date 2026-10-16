// specs/mob-notifications.md §1bis / AC-NT-29..31 — the SINGLE catalog of push
// texts, one entry per type and per stage. Pure TypeScript (no Deno API) so
// Vitest can test it. Rules: short, friendly, at most one emoji (none in the
// dues reminder), never guilt-tripping, no amount / absence reason / health
// data / vote count / voter identity; only T5 names a person (the winners).
// Wording is PROVISIONAL until PO-NT-11 (Bureau review) and uses "tu"
// (PO-NT-25 resolved: tutoiement).

export type PushKind = 'vote_reminder' | 'convocation_reminder' | 'dues_reminder' | 'mvp_announcement'

// One item as produced by private.collect_due_push_notifications() (SQL) or
// by the dues-reminder trigger. Mirrored by hand with that function's jsonb.
export interface PushItem {
  user_id: string
  kind: PushKind
  stage?: 'opening' | 'before_closing' | 'single'
  convocation_id?: string
  convocation_type?: 'training' | 'match' | 'meeting'
  starts_at?: string // ISO timestamp
  opponent_name?: string | null
  category_label?: string | null // vote_categories.label, never hard-coded
  winners?: string[] // full names, T5 only
}

export interface PushMessage {
  title: string
  body: string
  url: string
  tag: string
}

export const DEFAULT_CLUB_TIME_ZONE = 'Europe/Paris' // PO-NT-16: one constant, overridable by secret

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

/** "15 h" / "15 h 30". */
export function formatClockTime(date: Date, timeZone: string): string {
  const { hour, minute } = zonedParts(date, timeZone)
  return minute === 0 ? `${hour} h` : `${hour} h ${String(minute).padStart(2, '0')}`
}

/** 'today' | 'tomorrow' | 'other', in the club's time zone. */
export function dayRelativeTo(target: Date, now: Date, timeZone: string): 'today' | 'tomorrow' | 'other' {
  const t = zonedParts(target, timeZone)
  const n = zonedParts(now, timeZone)
  const dayIndex = (p: { year: number; month: number; day: number }) => Date.UTC(p.year, p.month - 1, p.day) / 86_400_000
  const diff = dayIndex(t) - dayIndex(n)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return 'other'
}

/** "A", "A et B", "A, B et C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function against(opponent: string | null | undefined): string {
  return opponent ? ` contre ${opponent}` : ''
}

function convocationPath(item: PushItem): string {
  return item.convocation_id ? `/convocations/${item.convocation_id}` : '/'
}

export function buildPushMessage(item: PushItem, now: Date, timeZone: string = DEFAULT_CLUB_TIME_ZONE): PushMessage {
  const category = item.category_label ?? 'Joueur du match'
  const opponent = item.opponent_name

  switch (item.kind) {
    case 'vote_reminder': {
      const tag = `vote-${item.convocation_id}-${item.stage}`
      if (item.stage === 'before_closing') {
        return {
          title: 'Dernier jour pour voter',
          body: `Il reste 24 h pour élire le ${lowerFirst(category)}${against(opponent)}. Un petit clic suffit.`,
          url: convocationPath(item),
          tag,
        }
      }
      return {
        title: '🏆 À toi de voter',
        body: `Qui a été le ${lowerFirst(category)}${against(opponent)} ? Le vote est ouvert.`,
        url: convocationPath(item),
        tag,
      }
    }

    case 'convocation_reminder': {
      const tag = `convocation-${item.convocation_id}`
      const startsAt = new Date(item.starts_at ?? now.toISOString())
      const time = formatClockTime(startsAt, timeZone)
      const day = dayRelativeTo(startsAt, now, timeZone)
      if (item.convocation_type === 'training') {
        const { hour } = zonedParts(startsAt, timeZone)
        const when = day === 'tomorrow' ? 'demain' : hour >= 17 ? 'ce soir' : "aujourd'hui"
        return {
          title: `Entraînement ${when} à ${time}`,
          body: 'Présent ou absent ? Dis-le à ton coach en un clic.',
          url: convocationPath(item),
          tag,
        }
      }
      const label = item.convocation_type === 'meeting' ? 'Réunion' : 'Match'
      const when = day === 'tomorrow' ? 'demain' : day === 'today' ? "aujourd'hui" : 'bientôt'
      return {
        title: `${label} ${when} à ${time}`,
        body: 'Tu seras de la partie ? Réponds à ta convocation, un petit clic suffit.',
        url: convocationPath(item),
        tag,
      }
    }

    case 'dues_reminder':
      // Financial data on a lock screen: no amount, no emoji, no sender (AC-NT-09, §1bis).
      return {
        title: 'Rappel de cotisation',
        body: 'Un petit point sur ta cotisation t\'attend dans l\'application.',
        url: '/',
        tag: 'dues-reminder',
      }

    case 'mvp_announcement': {
      const winners = item.winners ?? []
      const tag = `mvp-${item.convocation_id}`
      if (winners.length > 1) {
        return {
          title: `🏆 Égalité au vote${against(opponent)}`,
          body: `Bravo à ${joinNames(winners)}, élus ex æquo !`,
          url: convocationPath(item),
          tag,
        }
      }
      return {
        title: `🏆 ${category}${against(opponent)}`,
        body: `Bravo à ${winners[0] ?? ''} !`,
        url: convocationPath(item),
        tag,
      }
    }
  }
}
