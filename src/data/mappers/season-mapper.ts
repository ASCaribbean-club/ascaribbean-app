import type { Season, SeasonLabel } from '@domain/entities/season'
import type { SeasonRow } from '../dto/season-dto'

export function toSeason(row: SeasonRow): Season {
  return {
    id: row.id,
    label: row.label as SeasonLabel,
    startDate: row.start_date,
    endDate: row.end_date,
  }
}
