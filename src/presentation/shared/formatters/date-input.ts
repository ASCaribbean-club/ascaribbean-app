// `min`/`value` for a native `<input type="date">` (UI-only bound: prevents
// picking a past date in the picker — the actual rule lives in
// domain/rules/convocation-rules.ts's `isPastDate`, enforced by
// CreateConvocationUseCase and mirrored in a Postgres trigger). Built from
// local Y/M/D, not `toISOString().slice(0, 10)` — that reads UTC and would
// report yesterday's date for part of the evening in a UTC+ timezone.
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Combines a `type="date"` value (`YYYY-MM-DD`) and a `type="time"` value
// (`HH:MM`) into the ISO string CreateConvocationUseCaseInput's `date` /
// `meetingPointTime` fields expect. `new Date('YYYY-MM-DDTHH:MM')` (no `Z`
// suffix) parses as local time, matching what the user actually picked in
// their own timezone — `.toISOString()` then converts that to an
// unambiguous UTC instant for the wire, rather than sending a bare
// timezone-less string for Postgres to reinterpret under session settings.
export function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString()
}
