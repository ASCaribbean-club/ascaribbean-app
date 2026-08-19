// Fabriques de queryKey — un export par ressource, à figer dès le premier
// écran. Ne jamais définir de queryKey localement dans un hook ou composant.
//
// Forme : [ressource, ...discriminants] (ARCHITECTURE.md §6).
export const queryKeys = {
  coachTeams: (coachId: string) => ['teams', 'coach', coachId] as const,
  teamUpcomingConvocations: (teamId: string) => ['convocations', 'team', teamId, 'upcoming'] as const,
}
