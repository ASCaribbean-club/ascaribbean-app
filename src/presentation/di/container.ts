// Câble les implémentations de data/ aux use cases de domain/, un
// sous-container par domaine (di/containers/). Client Supabase unique,
// créé ici et transmis aux sous-containers — jamais recréé par domaine.
import { supabaseClient } from '@data/datasources/supabase-client'
import { createAuthContainer, type AuthContainer } from './containers/auth-container'
import { createCalendarContainer, type CalendarContainer } from './containers/calendar-container'
import { createCoachAlertsContainer, type CoachAlertsContainer } from './containers/coach-alerts-container'
import { createCoachDashboardContainer, type CoachDashboardContainer } from './containers/coach-dashboard-container'
import { createCoachTeamStatsContainer, type CoachTeamStatsContainer } from './containers/coach-team-stats-container'
import { createConvocationContainer, type ConvocationContainer } from './containers/convocation-container'
import { createMembershipsContainer, type MembershipsContainer } from './containers/memberships-container'
import { createNewsContainer, type NewsContainer } from './containers/news-container'
import { createPlayerDashboardContainer, type PlayerDashboardContainer } from './containers/player-dashboard-container'
import { createPlayerStatsContainer, type PlayerStatsContainer } from './containers/player-stats-container'
import { createProfileContainer, type ProfileContainer } from './containers/profile-container'
import { createSeasonsContainer, type SeasonsContainer } from './containers/seasons-container'
import { createSectionAndTeamsContainer, type SectionAndTeamsContainer } from './containers/section-and-teams-container'
import { createUsersContainer, type UsersContainer } from './containers/users-container'

export interface Container {
  auth: AuthContainer
  calendar: CalendarContainer
  coachAlerts: CoachAlertsContainer
  coachDashboard: CoachDashboardContainer
  coachTeamStats: CoachTeamStatsContainer
  convocation: ConvocationContainer
  memberships: MembershipsContainer
  news: NewsContainer
  playerDashboard: PlayerDashboardContainer
  playerStats: PlayerStatsContainer
  profile: ProfileContainer
  seasons: SeasonsContainer
  sectionAndTeams: SectionAndTeamsContainer
  users: UsersContainer
}

export function createContainer(): Container {
  return {
    auth: createAuthContainer(supabaseClient),
    calendar: createCalendarContainer(supabaseClient),
    coachAlerts: createCoachAlertsContainer(supabaseClient),
    coachDashboard: createCoachDashboardContainer(supabaseClient),
    coachTeamStats: createCoachTeamStatsContainer(supabaseClient),
    convocation: createConvocationContainer(supabaseClient),
    memberships: createMembershipsContainer(supabaseClient),
    news: createNewsContainer(supabaseClient),
    playerDashboard: createPlayerDashboardContainer(supabaseClient),
    playerStats: createPlayerStatsContainer(supabaseClient),
    profile: createProfileContainer(supabaseClient),
    seasons: createSeasonsContainer(supabaseClient),
    sectionAndTeams: createSectionAndTeamsContainer(supabaseClient),
    users: createUsersContainer(supabaseClient),
  }
}
