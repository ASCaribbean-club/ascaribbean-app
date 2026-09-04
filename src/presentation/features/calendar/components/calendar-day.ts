import type { ConvocationType } from '@domain/entities/convocation'

// Shared shape consumed by both WeekDayStrip and MonthGrid (via DayCell) —
// one calendar day, and the distinct convocation types occurring on it
// (deduplicated: two trainings the same day should still render one green
// dot, not two — the dot is "this type occurs today", not a per-event
// counter). Building this map from a role's convocation list (grouping by
// calendar day, capped at 3 dots + overflow per AC-CA design) is
// useCalendarViewModel's job, not these components' — see its TODOs.
export interface CalendarDayInfo {
  date: Date
  types: ConvocationType[]
}
