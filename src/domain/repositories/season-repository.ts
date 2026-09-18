import type { Season } from '../entities/season'

// specs/web-seasons.md §2.6 — "Une seule interface par ressource, pas de
// BackofficeSeasonRepository séparé" (same position as NewsRepository in
// web-actus). findCurrent() is kept EXACTLY as it was, in both signature and
// behaviour (AC-WS-13) — it backs the team-scoping RLS from AC-CD-01 and
// must not regress. findAll()/create()/update() are new, added here rather
// than on a second interface.
export interface SeasonRepository {
  // Resolves the season whose date range contains today, per Postgres'
  // current_season() function — never computed from a client-supplied date.
  // Returns null during a gap between two seasons (e.g. summer break before
  // the next season is created); callers must treat that as a valid state.
  findCurrent(): Promise<Season | null>

  // specs/web-seasons.md §2.6/AC-WS-13 — the /admin/seasons admin list,
  // every row, any status, ordering included. No `now` parameter: unlike
  // findCurrent(), this read isn't filtered by time at all — and unlike
  // NewsRepository.listAll(), no new RLS policy backs it either
  // (seasons_select_authenticated already returns every row to every
  // authenticated caller, §2.5).
  findAll(): Promise<Season[]>

  // specs/web-seasons.md §2.6 — CreateSeasonUseCase is the only caller,
  // never presentation/ directly (AC-WS-14/AC-WS-30).
  create(input: CreateSeasonInput): Promise<Season>

  // UpdateSeasonUseCase is the only caller. Targets the SAME row (AC-WS-24)
  // — "which rows are modifiable" (an ended season is not) is enforced by
  // the seasons_update_admin RLS policy, not by this repository or its
  // caller (§2.3/§3).
  update(id: string, input: UpdateSeasonInput): Promise<Season>
}

// Mirrors the entity minus what the database always derives itself (id).
// Never carries season_range: it isn't a field on Season either — it's a
// GENERATED ALWAYS STORED column, not part of the domain entity at all
// (§2.6, AC-WS-15). cotisationAmount (AC-WS-34, amendement du 2026-09-17
// (2)) is optional in practice — CreateSeasonUseCase/UpdateSeasonUseCase
// accept it as `number | null` — but not Partial<> here: the use cases
// always pass it explicitly (null when the dialog's field was left empty),
// same discipline as label/startDate/endDate.
export type CreateSeasonInput = Omit<Season, 'id'>

// Same fields as CreateSeasonInput — a season has nothing else to update
// (§2, no audit columns exist yet, PO-WS-03).
export type UpdateSeasonInput = Omit<Season, 'id'>
