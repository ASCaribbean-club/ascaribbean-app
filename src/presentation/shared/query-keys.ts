// Fabriques de queryKey — un export par ressource, à figer dès le premier
// écran. Ne jamais définir de queryKey localement dans un hook ou composant.
//
// Forme : [ressource, ...discriminants] (ARCHITECTURE.md §6).
export const queryKeys = {
  coachTeams: (coachId: string) => ['teams', 'coach', coachId] as const,
  teamUpcomingConvocations: (teamId: string) => ['convocations', 'team', teamId, 'upcoming'] as const,
  teamOpponents: (teamId?: string) => ['opponents', 'team', teamId ?? ''] as const,

  // specs/player-dashboard.md — distinct keys from the coach ones above even
  // though both start from the same team: the returned shape differs
  // (UpcomingConvocationForPlayer carries `myResponse`, not aggregate
  // `responseCounts`), so sharing a cache entry between the two screens
  // would be wrong even for a coach+player multi-role account.
  playerTeam: (teamId: string) => ['teams', 'player', teamId] as const,
  playerUpcomingConvocations: (teamId: string, userId: string) =>
    ['convocations', 'team', teamId, 'player', userId, 'upcoming'] as const,
  userMissingOrRejectedDocuments: (userId: string) => ['documents', 'missingOrRejected', userId] as const,

  // specs/match_details_page.md §7 — "deux clés distinctes quand la forme
  // retournée diffère". convocationDetail is shared by both role variants
  // (same GetConvocationWithDetailsUseCase shape regardless of who's
  // looking), but the "qui a répondu" block is NOT: the player-facing query
  // returns booleans (ConvocationResponderStatus[]) and the coach-facing one
  // returns a real tri-state roster + aggregate (ConvocationRosterForCoach)
  // — sharing one cache entry between the two would be wrong even for a
  // coach+player multi-role account viewing the same convocation.
  convocationDetail: (convocationId: string) => ['convocations', convocationId, 'detail'] as const,
  convocationResponders: (convocationId: string) => ['convocations', convocationId, 'responders'] as const,
  convocationRosterForCoach: (convocationId: string) => ['convocations', convocationId, 'roster', 'coach'] as const,
  playerConvocationResponse: (convocationId: string, userId: string) => ['convocations', convocationId, 'player', userId] as const,

  // Generic "team by id" lookup — deliberately NOT reusing `playerTeam`
  // above even though the shape (Team) is identical: that key's name is
  // player-specific, and this one backs the convocation detail hero's own
  // team name for EITHER role variant (specs/match_details_page.md UI
  // design, "Zone d'identité").
  team: (teamId: string) => ['teams', teamId] as const,

  // specs/profile-page.md — the profile screen's own reads. Both are
  // deliberately distinct from every key above even though they can touch
  // the same underlying tables:
  //  - profileRoleScopes: the WHOLE resolved+filtered per-role scope read
  //    (GetProfileRoleScopesUseCase composes TeamRepository AND
  //    SectionRepository behind one call) — not shared with `team`/
  //    `playerTeam`, which each return a single bare Team, not this
  //    screen's ProfileRoleScope[] shape.
  //  - profileDocuments: the user's FULL document list (ListProfileDocumentsUseCase),
  //    distinct from `userMissingOrRejectedDocuments` above — same table,
  //    different (unfiltered) shape.
  profileRoleScopes: (userId: string) => ['profile', userId, 'roleScopes'] as const,
  profileDocuments: (userId: string) => ['documents', 'profile', userId] as const,

  // specs/profile-page.md, 2026-09-04 addendum (PO-PR-06) — the user's own
  // membership + current season label, bundled (GetProfileMembershipUseCase
  // resolves both together, see that use case's own comment on why).
  // Distinct from `profileRoleScopes`: different table, different shape,
  // no reason to share a cache entry.
  profileMembership: (userId: string) => ['profile', userId, 'membership'] as const,
}
