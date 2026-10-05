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

  // Convocation detail hero title (2026-09-16 pass): "Entraînement —
  // {section.name}" needs the section a team belongs to, not the team
  // itself — a distinct resource from `team` above, same shape reasoning.
  section: (sectionId: string) => ['sections', sectionId] as const,

  // specs/profile-page.md — the profile screen's own read: the WHOLE
  // resolved+filtered per-role scope (GetProfileRoleScopesUseCase composes
  // TeamRepository AND SectionRepository behind one call) — not shared with
  // `team`/`playerTeam`, which each return a single bare Team, not this
  // screen's ProfileRoleScope[] shape.
  profileRoleScopes: (userId: string) => ['profile', userId, 'roleScopes'] as const,

  // specs/profile-page.md, 2026-09-04 addendum (PO-PR-06) — the user's own
  // membership + current season label, bundled (GetProfileMembershipUseCase
  // resolves both together, see that use case's own comment on why).
  // Distinct from `profileRoleScopes`: different table, different shape,
  // no reason to share a cache entry.
  profileMembership: (userId: string) => ['profile', userId, 'membership'] as const,

  // specs/calendar.md §7 (mentor-agent note) — deliberately NOT
  // `teamUpcomingConvocations` / `playerUpcomingConvocations` above, even
  // though both screens call the very same use cases
  // (ListUpcomingTeamConvocationsUseCase / ListUpcomingConvocationsForPlayerUseCase,
  // per that same note "reuse before forking"): PO-CA-02 requires this
  // screen's list to include past convocations too, a different temporal
  // scope than the dashboards' "upcoming only" reads. Sharing a cache entry
  // across a different scope would be wrong the moment that filter is
  // extended (see the TODOs on both use cases), so the key is split now
  // rather than after the fact. Shape still differs coach (`responseCounts`)
  // vs player (`myResponse`) — same reason the dashboard keys are split.
  calendarTeamConvocations: (teamId: string) => ['convocations', 'team', teamId, 'calendar'] as const,
  calendarPlayerConvocations: (teamId: string, userId: string) =>
    ['convocations', 'team', teamId, 'player', userId, 'calendar'] as const,

  // specs/actus.md — club-wide, identical for every role: no discriminant
  // beyond the resource name itself (no userId/teamId — nothing to scope by).
  newsFeed: () => ['news', 'feed'] as const,

  // specs/web-actus.md AC-WA-19 — the backoffice /admin/news admin list
  // (listAll(), every status/expiry). Deliberately a DISTINCT key from
  // newsFeed above even though both back a ClubNews[]: different repository
  // method, different RLS policy, different row set (admin sees draft/
  // archived/expired rows the mobile feed never does) — sharing one cache
  // entry between the two would leak backoffice-only rows into the mobile
  // feed's query cache for an admin+player multi-role account.
  newsAdminList: () => ['news', 'admin', 'list'] as const,

  // specs/player-vote.md — third tab on ConvocationDetailPage. Two distinct
  // keys, same "shape differs, don't share a cache entry" reasoning as
  // convocationDetail/convocationRosterForCoach above: voteMyBallot returns
  // ONE voter's own Vote|null (AC-PV-04/05), voteTally returns the
  // voter-identity-free aggregate every role reads (AC-PV-10) — sharing one
  // entry between the two would be wrong even for the same user on the same
  // convocation. PO-PV-01 is resolved (§7) — added now, so the
  // convention is fixed before any hook needs it (ARCHITECTURE.md §6, "les
  // queryKey se conventionnent dès le premier écran").
  voteMyBallot: (convocationId: string, categoryId: string, voterId: string) =>
    ['votes', convocationId, 'category', categoryId, 'voter', voterId] as const,
  voteTally: (convocationId: string, categoryId: string) => ['votes', convocationId, 'category', categoryId, 'tally'] as const,

  // Reference data (vote_categories), not scoped by convocation — the same
  // category row backs every convocation's Votes tab, so this key isn't
  // nested under `['votes', convocationId, ...]` like the two above.
  voteCategory: (categoryId: string) => ['voteCategories', categoryId] as const,

  // specs/web-seasons.md AC-WS-13/AC-WS-22 — the backoffice /admin/seasons
  // admin list (findAll(), every row, any status). Distinct resource key
  // from every team/convocation/profile key above, even though several of
  // those compose SeasonRepository.findCurrent() internally — see
  // seasonCurrent below for that one.
  seasonsAdminList: () => ['seasons', 'admin', 'list'] as const,

  // specs/web-seasons.md §4/AC-WS-22 — reserved for SeasonRepository.
  // findCurrent(): no ViewModel today wraps that call directly in its own
  // useQuery — it's composed INSIDE other use cases (GetProfileMembershipUseCase,
  // GetProfileRoleScopesUseCase, TeamRepositoryImpl), each cached under ITS
  // OWN key (profileMembership, profileRoleScopes, coachTeams, playerTeam,
  // team, ...). This key exists so useSeasonFormDialogViewModel's
  // invalidation literally "covers the key serving findCurrent(), if it is
  // cached" (AC-WS-22) without enumerating every one of those unrelated
  // feature keys, none of which this feature should know about or couple
  // itself to. If a future screen ever wraps findCurrent() directly in a
  // useQuery of its own, it must use THIS key rather than inventing a new
  // one, so this invalidation keeps doing its job.
  seasonCurrent: () => ['seasons', 'current'] as const,

  // specs/section-and-teams.md §2.7/AC-ST-22/AC-ST-41 — the /admin/sections
  // and /admin/teams admin lists (findAll()/findAllForAdmin(), unfiltered
  // by season). Deliberately DISTINCT from `coachTeams`/`playerTeam`/`team`/
  // `section` above: those back mobile screens filtered to the CURRENT
  // season (or to one specific id); sharing a cache entry with this
  // unfiltered admin read would leak out-of-season teams into a coach or
  // player screen for an admin+coach/player multi-role account (same
  // reasoning as `newsAdminList` vs `newsFeed`).
  sectionsAdminList: () => ['sections', 'admin', 'list'] as const,
  teamsAdminList: () => ['teams', 'admin', 'list'] as const,

  // The admin-only COACH(S) read (CoachRepository.listAllAssignments()) —
  // distinct from `coachTeams` (a specific coach's own, season-scoped team
  // list) and from nothing else today: no other screen reads every
  // user_roles 'coach' row unfiltered.
  coachAssignmentsAdminList: () => ['userRoles', 'admin', 'coach', 'list'] as const,

  // The AssignCoachDialog's `UTILISATEUR` dropdown (UserRepository.findAll(),
  // PO-ST-12b) — distinct from `profileRoleScopes`/`profileMembership`
  // above, neither of which returns a directory of every account.
  usersAdminList: () => ['users', 'admin', 'list'] as const,

  // specs/web-memberships.md §2.10/AC-WM-19 — the /admin/memberships admin
  // list (findAllForAdmin(), every non-archived row, any season). Distinct
  // from `profileMembership` above: that key backs the mobile profile's own
  // single-row-for-the-current-season read — sharing a cache entry between
  // the two would leak every member's adhésion into an admin+player
  // multi-role account's own profile screen (same reasoning as
  // `newsAdminList` vs `newsFeed`).
  membershipsAdminList: () => ['memberships', 'admin', 'list'] as const,

  // specs/web-memberships.md §2.2/UI design "RecordPaymentDialog" — one
  // membership's payment history, most-recent-first. Scoped per membership
  // (not a flat 'payments' list) — shared by RecordPaymentDialog AND
  // MembershipEditRow's own "HISTORIQUE DES VERSEMENTS" panel (both read
  // the SAME membership's history via useMembershipsDependencies), reused
  // as-is rather than forked per screen (amendement du 2026-09-17).
  membershipPayments: (membershipId: string) => ['memberships', membershipId, 'payments'] as const,

  // specs/web-memberships.md §2.10 (amendement du 2026-09-17) — EVERY
  // payment across every membership, one request, backing the admin list's
  // COTISATION column/filter (PaymentRepository.findAllForAdmin()).
  // Deliberately distinct from `membershipPayments` above: that key is
  // scoped to ONE membership's own history list, this one is the flat,
  // unscoped read the list screen groups client-side — sharing a cache
  // entry between the two would be wrong the moment either shape changes.
  membershipPaymentsAdminList: () => ['memberships', 'admin', 'payments'] as const,

  // specs/web-memberships.md §2.8/AC-WM-24 — the nav badge on "Adhésions".
  // Its own DEDICATED, light count read (CountMembershipsRequiringAttentionUseCase),
  // never the full `membershipsAdminList` counted client-side (§2.8 point
  // 1) — invalidated alongside `membershipsAdminList` on every
  // create/update/archive/payment mutation so the badge and the list never
  // drift apart.
  membershipsBadgeCount: () => ['memberships', 'badge', 'count'] as const,

  // specs/web-users.md §2.2/§2.10/AC-WU-20 — /admin/users' own table read
  // (UserRepository.findAdminDirectory()). Deliberately DISTINCT from
  // `usersAdminList` above: that key backs AssignCoachDialog/MembershipFormDialog's
  // `UTILISATEUR` dropdown (UserSummary — id/fullName/email only), this one
  // backs a richer shape (AdminUserDirectoryEntry — roles + completeness
  // facts) that no other screen needs — sharing one cache entry between the
  // two would be wrong the moment either shape changes (same reasoning as
  // `newsAdminList` vs `newsFeed`).
  usersAdminDirectory: () => ['users', 'admin', 'directory'] as const,

  // specs/web-users.md §2.3/§2.8/AC-WU-17 — the nav badge on "Utilisateurs".
  // Its own dedicated, LIGHT count read (CountUsersRequiringAttentionUseCase),
  // never the full `usersAdminDirectory` above counted client-side —
  // invalidated alongside `usersAdminDirectory` on every invite/rename/
  // role-assignment/membership-creation mutation so the badge and the row
  // icons never drift apart (same twin pattern as `membershipsBadgeCount`).
  usersBadgeCount: () => ['users', 'badge', 'count'] as const,

  // specs/web-users-membership-column.md §2.3b/PO-WU-18 — the
  // /admin/memberships filter-applied banner's own account-name lookup
  // (UserRepository.findById(), the "one small new read this amendment
  // introduces"), gated on the ?user= URL param being present. Same
  // "generic single-resource-by-id lookup" shape as `team`/`section` above
  // — distinct from `usersAdminDirectory`/`usersAdminList`, neither of
  // which backs a single-account-by-id read.
  user: (userId: string) => ['users', userId] as const,

  // specs/match-stats.md — the "Résultats" tab's own event log read.
  // Deliberately no separate `matchDetails` key: the score itself
  // (goalsFor/goalsAgainst) is part of MatchDetails, already resolved by
  // `convocationDetail` above (useConvocationDetailViewModel.ts) — a
  // second key for the exact same read would just cache it twice. The
  // scorer/card picker's eligible-roster shape is the SAME
  // ConvocationRosterForCoach the Effectif tab already caches under
  // `convocationRosterForCoach` — reused as-is, not forked here.
  matchEvents: (convocationId: string) => ['convocations', convocationId, 'matchEvents'] as const,

  // specs/player-stats.md §6.3 — three INDEPENDENT keys, one per RPC, not
  // one combined "playerStats" key: the UI design requires the response and
  // attendance cards to load/render independently (§4.2, "les deux blocs
  // restent indépendants" — one can be ready while the other isn't), which
  // a single shared query would make impossible to express. Scoped by
  // userId even though the RPCs take no parameter (auth.uid() only) — same
  // convention as every other per-user key in this file (profileRoleScopes,
  // profileMembership), so a multi-role/shared-device account never shows a
  // stale cache entry across two different signed-in users.
  playerStatsAttendanceSummary: (userId: string) => ['playerStats', userId, 'attendanceSummary'] as const,
  playerStatsResponseSummary: (userId: string) => ['playerStats', userId, 'responseSummary'] as const,
  playerStatsGoalsCount: (userId: string) => ['playerStats', userId, 'goalsCount'] as const,

  // specs/player-stats.md addendum "troisième passage" (PO-PS-12
  // partiellement tranché) — attendance-only breakdown by convocation type.
  // A FOURTH independent key, not folded into playerStatsAttendanceSummary
  // above: different RPC, different shape (a list, not one aggregate row),
  // same "don't share a cache entry across a different shape" reasoning as
  // every other split key in this file.
  playerStatsAttendanceSummaryByType: (userId: string) => ['playerStats', userId, 'attendanceSummaryByType'] as const,

  // specs/player-stats.md addendum "PO-PS-03 tranché" — a player's own
  // yellow/red card counts (get_my_cards_count()). Its own key, same
  // reasoning as the others above.
  playerStatsCardsCount: (userId: string) => ['playerStats', userId, 'cardsCount'] as const,

  // specs/coach-team-stats.md §6 point 5 — "les discriminants incluent au
  // minimum l'équipe et la saison". The season discriminant is folded into
  // `teamId` itself rather than added as a separate parameter: a Team row IS
  // per-season (teams.season_id not null, PO-CTS-03), so a different
  // season's team already has a different id — reusing `coachTeams` above
  // isn't possible here (that key returns CoachTeamSummary[], this one
  // returns the whole TeamStats shape: roster + attendance + goals + cards,
  // a different read entirely).
  teamStats: (teamId: string) => ['teams', teamId, 'stats'] as const,

  // specs/mobile-leaderboard.md — the three ranked tabs' shared read
  // (get_team_leaderboard), one entry per team; a Team row is per-season so
  // the season is folded into the id, same reasoning as `teamStats`.
  teamLeaderboard: (teamId: string) => ['teams', teamId, 'leaderboard'] as const,
  // Presence tab read (get_team_presence_leaderboard), fetched on tab open.
  teamPresenceLeaderboard: (teamId: string) => ['teams', teamId, 'leaderboard', 'presence'] as const,

  // specs/coach-dashboard.md §1 point 7 (PO-1) / specs/player-dashboard.md
  // PO-PD-07 — GetTeamRecentFormUseCase's read (form + season goals for/
  // against). Shared by BOTH dashboards' equivalent block: a team's recent
  // form has no per-role variant, only a per-team one, so one key covers a
  // coach and a player looking at the same team (same reasoning as why the
  // use case itself isn't forked per screen).
  teamRecentForm: (teamId: string) => ['teams', teamId, 'recentForm'] as const,

  // specs/coach-alerts.md §6 point 4 / AC-AL-20 — discriminant is the
  // ACTIVE team only (never the coach id): PO-AL-01 resolved, this screen is
  // bounded to one team at a time, so a team switch in CoachHeader must
  // invalidate/reload this key exactly like `teamStats`/`teamRecentForm`
  // above, never carry over the previous team's alerts.
  coachAlerts: (teamId: string) => ['convocations', 'team', teamId, 'coachAlerts'] as const,

  // specs/web-audit-logs.md §2.6/§2.7/AC-AU-24 — discriminated by the
  // filters themselves (never the page: useInfiniteQuery accumulates pages
  // under ONE key, per filter set — changing a filter therefore means a
  // brand-new key, which is exactly what makes "changer un filtre
  // réinitialise la pagination" (AC-AU-13) true for free, with no manual
  // reset anywhere in the ViewModel). `from`/`to` as ISO strings (or null),
  // `actions` sorted so the key is stable regardless of check/uncheck order.
  auditLog: (filters: { from: string | null; to: string | null; actions: string[] }) =>
    ['audit-log', filters] as const,

  // specs/web-localizations.md §2.5 — ONE shared resource root for the
  // admin list and the selector's non-archived list, so a single
  // invalidation of `trainingLocationsRoot` refreshes both (same reasoning
  // as `teamOpponents(teamId)`). The two lists stay distinct keys under that
  // root: different repository method, different row set (the admin one
  // includes archived rows) — sharing one cache entry would be wrong.
  trainingLocationsRoot: () => ['training-locations'] as const,
  trainingLocationsAdminList: () => ['training-locations', 'admin', 'list'] as const,
  trainingLocationsAvailable: () => ['training-locations', 'available'] as const,

  // specs/web-mission-templates.md §2.4 — one root; the list is a single
  // query filtered by type client-side, so every write invalidates the root.
  missionTemplatesRoot: () => ['mission-templates'] as const,

  // specs/match-details-missions.md §2.7 — dedicated root, invalidated after
  // every mission mutation of that convocation.
  convocationMissions: (convocationId: string) => ['convocation-missions', convocationId] as const,

  // specs/coach-match-composition.md — one lineup per convocation. The read
  // differs per role only through the server (player window, AC-MC-09), so a
  // single key per convocation is right: a session has one active role at a
  // time on this screen.
  matchLineup: (convocationId: string) => ['convocations', convocationId, 'lineup'] as const,

  // specs/web-create-convocation.md AC-WC-16/AC-WC-34 — backoffice
  // convocations. The list key is discriminated by the filters (a change of
  // filter starts that key's own cache entry at page 0); every mutation
  // invalidates the root prefix. `convocationsRoot` is the mobile screens'
  // shared prefix (calendar, dashboards, detail), invalidated too so they
  // don't serve a stale copy after an admin edit.
  adminConvocationsRoot: () => ['admin-convocations'] as const,
  adminConvocationsList: (filters: {
    seasonId: string | null
    sectionId: string | null
    teamId: string | null
    type: string | null
    period: string
    unrecordedOnly: boolean
    dateRange?: { from: string; to: string }
  }) => ['admin-convocations', 'list', filters] as const,
  adminConvocationsUnrecordedCount: (seasonId: string | null) => ['admin-convocations', 'unrecorded-count', seasonId ?? ''] as const,
  adminConvocation: (convocationId: string) => ['admin-convocations', 'detail', convocationId] as const,
  adminAttendanceSheet: (convocationId: string) => ['admin-convocations', 'attendance', convocationId] as const,
  convocationsRoot: () => ['convocations'] as const,

  // specs/player-unavailability.md — the team availability list. One key per
  // team: the projected shape (coach vs teammate) is decided server-side by
  // get_team_availability from the caller, so it never differs for the same
  // session and team.
  teamAvailability: (teamId: string) => ['availability', 'team', teamId] as const,
  // A player's raw unavailability records, as seen by their coach / the
  // Dirigeant (edit sheet pre-fill). Per caller: the Dirigeant never gets medical rows.
  playerUnavailabilities: (playerId: string) => ['availability', 'player', playerId] as const,

  // specs/mobile-dirigeant-habilite.md — club-wide Dirigeant keys. All
  // DISTINCT from the coach/player/admin ones above (different row sets and
  // shapes; sharing an entry would leak club-wide data into a coach view for
  // a coach+officer multi-role account). The section filter is NOT a
  // discriminant: filtering happens client-side on the cached list.
  clubOverview: () => ['club', 'overview'] as const,
  clubSchedule: () => ['convocations', 'club', 'schedule'] as const,
  clubTeams: () => ['teams', 'club', 'current-season'] as const,
  clubSections: () => ['sections', 'club', 'list'] as const,
  // The mobile console list (drafts + published, never archived) — distinct
  // from newsAdminList (everything) and newsFeed (visible only).
  newsManageList: () => ['news', 'manage', 'list'] as const,
}
