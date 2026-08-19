// Câble les implémentations de data/ aux use cases de domain/, un
// sous-container par domaine (di/containers/). Client Supabase unique,
// créé ici et transmis aux sous-containers — jamais recréé par domaine.
import { supabaseClient } from '@data/datasources/supabase-client'
import { createAuthContainer, type AuthContainer } from './containers/auth-container'
import { createCoachDashboardContainer, type CoachDashboardContainer } from './containers/coach-dashboard-container'

export interface Container {
  auth: AuthContainer
  coachDashboard: CoachDashboardContainer
}

export function createContainer(): Container {
  return {
    auth: createAuthContainer(supabaseClient),
    coachDashboard: createCoachDashboardContainer(supabaseClient),
  }
}
