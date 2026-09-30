// specs/web-audit-logs.md §2.6 — the spec itself leaves the timezone
// interpretation of the two date-only inputs open ("bornes interprétées
// dans le fuseau du navigateur... à corriger par la développeuse si elle
// préfère l'UTC — c'est une décision d'implémentation"). Implementation
// decision taken here: Europe/Paris, not the browser's own timezone — two
// administrators filtering "10/01/2026" from two different timezones must
// see the exact same rows, and the club itself only ever operates in one
// timezone. `to` is INCLUSIVE from the admin's perspective (the whole day
// they picked); the repository bound this produces is the EXCLUSIVE start
// of the day after — AuditLogFilters (domain/repositories/audit-log-repository.ts)
// only ever sees already-resolved instants, never a date-only string or a
// timezone name.
//
// Pure, no React/Supabase import (CLAUDE.md §3) — lives in presentation/
// rather than domain/ because parsing an <input type="date"> string is a UI
// input-shape concern, not a business rule the domain would still need if
// this app had no form at all.

export interface AuditLogDateRange {
  from?: Date
  to?: Date
}

const AUDIT_LOG_FILTER_TIME_ZONE = 'Europe/Paris'

export function toAuditLogDateRange(fromDateOnly: string | null, toDateOnly: string | null): AuditLogDateRange {
  return {
    from: fromDateOnly ? parisDayStart(fromDateOnly) : undefined,
    to: toDateOnly ? parisDayStart(addDaysToDateOnly(toDateOnly, 1)) : undefined,
  }
}

// The UTC instant corresponding to 00:00 local time in Europe/Paris on the
// given calendar day — DST-aware (a spring-forward day is 23h long, a
// fall-back day 25h, both handled by recomputing the actual UTC offset in
// effect for that specific date rather than assuming a fixed +1/+2).
function parisDayStart(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split('-').map(Number)
  const utcMidnightGuess = Date.UTC(year, month - 1, day, 0, 0, 0)
  const offsetMinutes = timeZoneOffsetMinutes(new Date(utcMidnightGuess), AUDIT_LOG_FILTER_TIME_ZONE)
  return new Date(utcMidnightGuess - offsetMinutes * 60_000)
}

// Calendar-day arithmetic on the date-only STRING, not on a Date built from
// it (a `new Date('YYYY-MM-DD')` reads as UTC midnight, and shifting that by
// a day via setDate() would silently reintroduce the exact "which
// timezone?" ambiguity this file exists to remove).
function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// The offset (minutes, east of UTC) `timeZone` observes at `instant` —
// computed by formatting `instant` as wall-clock digits IN that timeZone,
// then re-reading those same digits AS IF they were UTC: the difference
// between the two is exactly the zone's offset at that moment, DST
// included. No date library needed (none is a dependency of this project).
function timeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return (asUtc - instant.getTime()) / 60_000
}
