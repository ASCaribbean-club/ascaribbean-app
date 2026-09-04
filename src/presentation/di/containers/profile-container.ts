import type { SupabaseClient } from '@supabase/supabase-js'
import { CoachRepositoryImpl } from '@data/repositories/CoachRepositoryImpl'
import { MembershipRepositoryImpl } from '@data/repositories/MembershipRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { SectionRepositoryImpl } from '@data/repositories/SectionRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import type { CoachRepository } from '@domain/repositories/coach-repository'
import type { MembershipRepository } from '@domain/repositories/membership-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { SectionRepository } from '@domain/repositories/section-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import { GetProfileMembershipUseCase } from '@domain/usecases/profile/GetProfileMembershipUseCase'
import { GetProfileRoleScopesUseCase } from '@domain/usecases/profile/GetProfileRoleScopesUseCase'

export interface ProfileContainer {
  teamRepository: TeamRepository
  sectionRepository: SectionRepository
  coachRepository: CoachRepository
  membershipRepository: MembershipRepository
  seasonRepository: SeasonRepository

  getProfileRoleScopesUseCase: GetProfileRoleScopesUseCase
  getProfileMembershipUseCase: GetProfileMembershipUseCase
}

export function createProfileContainer(supabaseClient: SupabaseClient): ProfileContainer {
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const sectionRepository = new SectionRepositoryImpl(supabaseClient)
  const coachRepository = new CoachRepositoryImpl(supabaseClient)
  const membershipRepository = new MembershipRepositoryImpl(supabaseClient)
  const getProfileRoleScopesUseCase = new GetProfileRoleScopesUseCase(teamRepository, sectionRepository, coachRepository, seasonRepository)
  const getProfileMembershipUseCase = new GetProfileMembershipUseCase(membershipRepository, seasonRepository)

  return {
    teamRepository,
    sectionRepository,
    coachRepository,
    membershipRepository,
    seasonRepository,
    getProfileRoleScopesUseCase,
    getProfileMembershipUseCase,
  }
}
