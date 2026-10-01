import type { AdminConvocationFilters, AdminConvocationPeriod } from '@domain/entities/admin-convocation'
import type { Team } from '@domain/entities/team'

// specs/web-create-convocation.md UI design "Filtres" — defaults and the
// "differs from default" test that drives the "Réinitialiser" button.
// `seasonId: null` means "the default season" (the current one), resolved by
// the ViewModel once it is known.
export interface ConvocationFilterState {
  seasonId: string | null
  sectionId: string | null
  teamId: string | null
  type: AdminConvocationFilters['type']
  period: AdminConvocationPeriod
  unrecordedOnly: boolean
}

export const DEFAULT_CONVOCATION_FILTER_STATE: ConvocationFilterState = {
  seasonId: null,
  sectionId: null,
  teamId: null,
  type: null,
  period: 'all',
  unrecordedOnly: false,
}

export function isConvocationFilterActive(state: ConvocationFilterState, currentSeasonId: string | null): boolean {
  const seasonDiffers = state.seasonId !== null && state.seasonId !== currentSeasonId
  return (
    seasonDiffers ||
    state.sectionId !== null ||
    state.teamId !== null ||
    state.type !== null ||
    state.period !== DEFAULT_CONVOCATION_FILTER_STATE.period ||
    state.unrecordedOnly
  )
}

// True when the ONLY thing narrowing the list is the "Présences non saisies"
// pastille — it drives the distinct "Toutes les présences sont saisies" copy.
export function isOnlyUnrecordedFilterActive(state: ConvocationFilterState, currentSeasonId: string | null): boolean {
  return state.unrecordedOnly && !isConvocationFilterActive({ ...state, unrecordedOnly: false }, currentSeasonId)
}

// "Équipe" options: restricted to the selected season and, when set, section.
export function teamsForFilters(teams: Team[], seasonId: string | null, sectionId: string | null): Team[] {
  return teams
    .filter((team) => (seasonId === null || team.seasonId === seasonId) && (sectionId === null || team.sectionId === sectionId))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}
