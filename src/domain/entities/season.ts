export type SeasonLabel = `${number}-${number}` // e.g. "2026-2027"

export interface Season {
  id: string
  label: SeasonLabel
  startDate: string // ISO date
  endDate: string // ISO date
}
