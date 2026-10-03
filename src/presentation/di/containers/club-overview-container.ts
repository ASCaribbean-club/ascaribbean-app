import type { SupabaseClient } from '@supabase/supabase-js'
import { ClubOverviewRepositoryImpl } from '@data/repositories/ClubOverviewRepositoryImpl'
import { ClubScheduleRepositoryImpl } from '@data/repositories/ClubScheduleRepositoryImpl'
import { MatchDetailsRepositoryImpl } from '@data/repositories/MatchDetailsRepositoryImpl'
import { MeetingDetailsRepositoryImpl } from '@data/repositories/MeetingDetailsRepositoryImpl'
import { OpponentRepositoryImpl } from '@data/repositories/OpponentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { SectionRepositoryImpl } from '@data/repositories/SectionRepositoryImpl'
import type { SectionRepository } from '@domain/repositories/section-repository'
import { GetClubOverviewUseCase } from '@domain/usecases/club-overview/GetClubOverviewUseCase'
import { ListClubTeamsUseCase } from '@domain/usecases/club-overview/ListClubTeamsUseCase'
import { ListClubScheduleUseCase } from '@domain/usecases/club-overview/ListClubScheduleUseCase'

// specs/mobile-dirigeant-habilite.md — shared by the Dirigeant dashboard and
// the Dirigeant variant of the calendar. This container's OWN repository
// instances, same per-container pattern as every other one.
export interface ClubOverviewContainer {
  // Plain passthrough read (RLS sections_select_authenticated), same
  // "no wrapping use case" precedent as SectionRepository.findAll().
  sectionRepository: SectionRepository
  getClubOverviewUseCase: GetClubOverviewUseCase
  listClubScheduleUseCase: ListClubScheduleUseCase
  // Section -> Équipe picker of the Dirigeant's convocation form (§1.4).
  listClubTeamsUseCase: ListClubTeamsUseCase
}

export function createClubOverviewContainer(supabaseClient: SupabaseClient): ClubOverviewContainer {
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const sectionRepository = new SectionRepositoryImpl(supabaseClient)
  const clubOverviewRepository = new ClubOverviewRepositoryImpl(supabaseClient)
  const clubScheduleRepository = new ClubScheduleRepositoryImpl(supabaseClient, seasonRepository)

  return {
    sectionRepository,
    listClubTeamsUseCase: new ListClubTeamsUseCase(clubScheduleRepository),
    getClubOverviewUseCase: new GetClubOverviewUseCase(clubOverviewRepository),
    listClubScheduleUseCase: new ListClubScheduleUseCase(
      clubScheduleRepository,
      new MatchDetailsRepositoryImpl(supabaseClient),
      new MeetingDetailsRepositoryImpl(supabaseClient),
      new OpponentRepositoryImpl(supabaseClient),
    ),
  }
}
