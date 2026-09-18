// Câble les implémentations de data/ aux use cases de domain/, un
// sous-container par domaine (di/containers/). Client Supabase unique,
// créé ici et transmis aux sous-containers — jamais recréé par domaine.
import { supabaseClient } from '@data/datasources/supabase-client'
import { createAuthContainer, type AuthContainer } from './containers/auth-container'
import { createCalendarContainer, type CalendarContainer } from './containers/calendar-container'
import { createCoachDashboardContainer, type CoachDashboardContainer } from './containers/coach-dashboard-container'
import { createConvocationContainer, type ConvocationContainer } from './containers/convocation-container'
import { createMembershipsContainer, type MembershipsContainer } from './containers/memberships-container'
import { createNewsContainer, type NewsContainer } from './containers/news-container'
import { createPlayerDashboardContainer, type PlayerDashboardContainer } from './containers/player-dashboard-container'
import { createProfileContainer, type ProfileContainer } from './containers/profile-container'
import { createSeasonsContainer, type SeasonsContainer } from './containers/seasons-container'
import { createSectionAndTeamsContainer, type SectionAndTeamsContainer } from './containers/section-and-teams-container'

export interface Container {
  auth: AuthContainer
  calendar: CalendarContainer
  coachDashboard: CoachDashboardContainer
  convocation: ConvocationContainer
  memberships: MembershipsContainer
  news: NewsContainer
  playerDashboard: PlayerDashboardContainer
  profile: ProfileContainer
  seasons: SeasonsContainer
  sectionAndTeams: SectionAndTeamsContainer
}

export function createContainer(): Container {
  return {
    auth: createAuthContainer(supabaseClient),
    calendar: createCalendarContainer(supabaseClient),
    coachDashboard: createCoachDashboardContainer(supabaseClient),
    convocation: createConvocationContainer(supabaseClient),
    memberships: createMembershipsContainer(supabaseClient),
    news: createNewsContainer(supabaseClient),
    playerDashboard: createPlayerDashboardContainer(supabaseClient),
    profile: createProfileContainer(supabaseClient),
    seasons: createSeasonsContainer(supabaseClient),
    sectionAndTeams: createSectionAndTeamsContainer(supabaseClient),
  }
}
