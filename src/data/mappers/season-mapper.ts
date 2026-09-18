import type { Season, SeasonLabel } from '@domain/entities/season'
import type { CreateSeasonInput, UpdateSeasonInput } from '@domain/repositories/season-repository'
import type { SeasonInsertRow, SeasonRow, SeasonUpdateRow } from '../dto/season-dto'

export function toSeason(row: SeasonRow): Season {
  return {
    id: row.id,
    label: row.label as SeasonLabel,
    startDate: row.start_date,
    endDate: row.end_date,
    cotisationAmount: row.cotisation_amount,
  }
}

// specs/web-seasons.md §2.6 — the reverse direction, input -> row, needed by
// SeasonRepositoryImpl.create() (CLAUDE.md §4, a mapper always sits between
// DTO and entity, both directions). Never season_range (AC-WS-15) — it
// isn't even a field on CreateSeasonInput.
export function toSeasonInsertRow(input: CreateSeasonInput): SeasonInsertRow {
  return {
    label: input.label,
    start_date: input.startDate,
    end_date: input.endDate,
    cotisation_amount: input.cotisationAmount,
  }
}

// Same reverse mapping for SeasonRepositoryImpl.update().
export function toSeasonUpdateRow(input: UpdateSeasonInput): SeasonUpdateRow {
  return {
    label: input.label,
    start_date: input.startDate,
    end_date: input.endDate,
    cotisation_amount: input.cotisationAmount,
  }
}
