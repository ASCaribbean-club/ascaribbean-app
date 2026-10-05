// Câble les implémentations de data/ aux use cases de domain/, un
// sous-container par domaine (di/containers/). Client Supabase unique,
// créé ici et transmis aux sous-containers — jamais recréé par domaine.
import { supabaseClient } from '@data/datasources/supabase-client'
import { createAuditLogContainer, type AuditLogContainer } from './containers/audit-log-container'
import { createAuthContainer, type AuthContainer } from './containers/auth-container'
import { createCalendarContainer, type CalendarContainer } from './containers/calendar-container'
import { createClubOverviewContainer, type ClubOverviewContainer } from './containers/club-overview-container'
import { createCoachAlertsContainer, type CoachAlertsContainer } from './containers/coach-alerts-container'
import { createCoachDashboardContainer, type CoachDashboardContainer } from './containers/coach-dashboard-container'
import { createCoachTeamStatsContainer, type CoachTeamStatsContainer } from './containers/coach-team-stats-container'
import { createConvocationAdminContainer, type ConvocationAdminContainer } from './containers/convocation-admin-container'
import { createConvocationContainer, type ConvocationContainer } from './containers/convocation-container'
import { createLeaderboardContainer, type LeaderboardContainer } from './containers/leaderboard-container'
import { createMembershipsContainer, type MembershipsContainer } from './containers/memberships-container'
import { createMissionTemplatesContainer, type MissionTemplatesContainer } from './containers/mission-templates-container'
import { createNewsContainer, type NewsContainer } from './containers/news-container'
import { createPlayerDashboardContainer, type PlayerDashboardContainer } from './containers/player-dashboard-container'
import { createPlayerStatsContainer, type PlayerStatsContainer } from './containers/player-stats-container'
import { createProfileContainer, type ProfileContainer } from './containers/profile-container'
import { createSeasonsContainer, type SeasonsContainer } from './containers/seasons-container'
import { createSectionAndTeamsContainer, type SectionAndTeamsContainer } from './containers/section-and-teams-container'
import { createTrainingLocationsContainer, type TrainingLocationsContainer } from './containers/training-locations-container'
import { createTeamAvailabilityContainer, type TeamAvailabilityContainer } from './containers/team-availability-container'
import { createTreasurerContainer, type TreasurerContainer } from './containers/treasurer-container'
import { createUsersContainer, type UsersContainer } from './containers/users-container'

export interface Container {
  auditLog: AuditLogContainer
  auth: AuthContainer
  calendar: CalendarContainer
  clubOverview: ClubOverviewContainer
  coachAlerts: CoachAlertsContainer
  coachDashboard: CoachDashboardContainer
  coachTeamStats: CoachTeamStatsContainer
  convocation: ConvocationContainer
  convocationAdmin: ConvocationAdminContainer
  leaderboard: LeaderboardContainer
  memberships: MembershipsContainer
  missionTemplates: MissionTemplatesContainer
  news: NewsContainer
  playerDashboard: PlayerDashboardContainer
  playerStats: PlayerStatsContainer
  profile: ProfileContainer
  seasons: SeasonsContainer
  sectionAndTeams: SectionAndTeamsContainer
  teamAvailability: TeamAvailabilityContainer
  trainingLocations: TrainingLocationsContainer
  treasurer: TreasurerContainer
  users: UsersContainer
}

export function createContainer(): Container {
  return {
    auditLog: createAuditLogContainer(supabaseClient),
    auth: createAuthContainer(supabaseClient),
    calendar: createCalendarContainer(supabaseClient),
    clubOverview: createClubOverviewContainer(supabaseClient),
    coachAlerts: createCoachAlertsContainer(supabaseClient),
    coachDashboard: createCoachDashboardContainer(supabaseClient),
    coachTeamStats: createCoachTeamStatsContainer(supabaseClient),
    convocation: createConvocationContainer(supabaseClient),
    convocationAdmin: createConvocationAdminContainer(supabaseClient),
    leaderboard: createLeaderboardContainer(supabaseClient),
    memberships: createMembershipsContainer(supabaseClient),
    missionTemplates: createMissionTemplatesContainer(supabaseClient),
    news: createNewsContainer(supabaseClient),
    playerDashboard: createPlayerDashboardContainer(supabaseClient),
    playerStats: createPlayerStatsContainer(supabaseClient),
    profile: createProfileContainer(supabaseClient),
    seasons: createSeasonsContainer(supabaseClient),
    sectionAndTeams: createSectionAndTeamsContainer(supabaseClient),
    teamAvailability: createTeamAvailabilityContainer(supabaseClient),
    trainingLocations: createTrainingLocationsContainer(supabaseClient),
    treasurer: createTreasurerContainer(supabaseClient),
    users: createUsersContainer(supabaseClient),
  }
}
