import type { Role } from '../entities/user'
import type { Action } from './actions'

// Source de référence lisible — chaque politique RLS porte en commentaire SQL
// le nom de l'action correspondante pour vérifier la correspondance à l'œil.
//
// RLS-only vs RLS + entrée ici : une entrée n'a sa place dans cette matrice
// que si presentation/ doit décider quelque chose (afficher/masquer, activer/
// désactiver, brancher un layout) avant ou indépendamment du résultat de la
// requête. Si presentation/ se contente de rendre ce que le repository a
// renvoyé, RLS seule suffit et il ne faut pas dupliquer la règle ici — une
// copie sans consommateur front est un risque de divergence, pas une sécurité
// supplémentaire.
// Exemple RLS-only (donc volontairement absent d'ici) : lecture de son propre
// profil/adhésion/documents, lecture des convocations et réponses de son
// équipe (joueur et coach), lecture admin sans restriction — l'écran ne
// change pas de structure, seul le contenu retourné diffère.
export const rbacMatrix: Record<Action, Role[]> = {
  // specs/create-convocation.md §3 — 'section-manager' added here. See the
  // matching TODO in can.ts's 'section-manager' branch: adding the role
  // here without that scope check would let a section-manager create a
  // convocation for ANY team, not just one in their own section.
  'convocation:create': ['coach', 'section-manager', 'authorized-officer', 'admin'],
  // Mirrors convocations_insert_create (RLS) — `date > now() or is_admin()`.
  'convocation:create_retroactive': ['admin'],
  'convocation:respond': ['player'],
  'section:manage': ['section-manager', 'admin'],

  // specs/coach-attendance-confirmation.md §2 — "Décision de cadrage":
  // ['coach'] only, scoped to their own team (see the matching fix in
  // can.ts's 'coach' branch). NOT 'admin', even though the RLS policies
  // (attendance_records_insert_validate / _update_validate) already grant
  // the write to admin too — that grant predates this action and is kept
  // as a statu quo in RLS, but no matrix entry / UI entry point is built
  // for it in this pass (PO-AT-01, still open). NOT 'section-manager'
  // either, despite the developer's own hunch that they should hold this —
  // the closest matrix row ("Saisir une évaluation sportive") says ❌ for
  // that role, so extending it needs PO-AT-01 resolved first, not an
  // extensive reading of a neighboring row.
  //
  // specs/web-create-convocation.md §2 (PO-AT-01(b) tranché par la
  // développeuse, 2026-10-01) — 'admin' ADDED: a deliberate gap from the
  // closest CDC row ("Saisir une évaluation sportive", ❌ for admin), the
  // Bureau still to validate it (PO-WC-06). Mirrors the admin sibling
  // policies attendance_records_insert_validate_admin /
  // attendance_records_update_validate_admin (PAST convocations only, never
  // 'cancelled') — see supabase/migrations/20261001120000_web_create_convocation.sql.
  // The coach branch is unchanged (can.ts, no time window for a coach).
  'attendance:validate': ['coach', 'admin'],

  // specs/player-vote.md §2 — "Il n'existe aucune ligne de matrice
  // applicable" for a positive vote: this is a brand-new matrix row, not an
  // extrapolation of an existing one (the closest CDC line, "Saisir une
  // évaluation sportive", grants the OPPOSITE role pair — coach writes,
  // player reads — reusing it would be a contresens, not a shortcut).
  // Scoped to the voter's own team, same shape as 'convocation:respond'
  // above — enforced by can.ts's 'player' branch (`requiresTeamScope`),
  // extended in the same pass to cover this action too.
  'vote:cast': ['player'],

  // specs/web-empty-state.md §2 — narrowest position retained for this pass:
  // 'admin' only ("moindre privilège", the matrix itself gives no other role
  // a line exclusive to club-wide administration). Club-wide by construction
  // — the 'admin' RoleAssignment carries no scope field — so no matching
  // scope check is needed in can.ts (its default branch already returns
  // true for any role without a scoped case of its own).
  // PO-WE-01 stays open: widening to 'authorized-officer' and/or
  // 'section-manager' is a product decision, not made here. If
  // 'section-manager' is ever added, see can.ts's own 'section-manager'
  // branch first — its scope IS bounded to one section, unlike this shell's
  // club-wide nav, so admitting it would need a new scope check, not just
  // this row.
  'backoffice:access': ['admin'],

  // specs/web-actus.md §3 — "Position retenue quand même : créer l'action."
  // Narrowest position, same reasoning as 'backoffice:access' above
  // ("moindre privilège", no other matrix row is exclusive to club-wide
  // administration of club_news). Club-wide by construction (the 'admin'
  // RoleAssignment carries no scope field) — no matching scope check is
  // needed in can.ts, same as 'backoffice:access'.
  // Mirrors 3 RLS policies on public.club_news (club_news_select_admin,
  // club_news_insert_admin, club_news_update_admin) — see
  // supabase/migrations/<timestamp>_web_actus_news_write_policies.sql.
  // PO-WA-08 stays open: widening beyond 'admin' is a product decision, not
  // made here.
  //
  // specs/mobile-dirigeant-habilite.md §2 (PO-DH-04): the scope of this
  // action NARROWED to archiving a news item (ArchiveClubNewsUseCase) and the
  // backoffice console. Creating and editing moved to 'news:create' /
  // 'news:update' below. Still ['admin'] only — the authorized-officer must
  // not archive (the RLS update policy for that role refuses status
  // 'archived').
  'news:write': ['admin'],

  // specs/mobile-dirigeant-habilite.md §2 — mirrors the RLS policies
  // club_news_insert_admin + club_news_insert_authorized_officer
  // (supabase/migrations/20261003123047_dirigeant_news_write_policies.sql).
  // Club-wide: no RoleAssignment scope field, no can.ts branch needed.
  // Still requires the Bureau's confirmation (PO-WA-08 / PO-DH-04).
  'news:create': ['admin', 'authorized-officer'],

  // Mirrors club_news_update_admin + club_news_update_authorized_officer
  // (same migration). The officer's policy limits status to draft/published;
  // the use case's CreatableClubNewsStatus type is the TypeScript side of
  // that same limit.
  'news:update': ['admin', 'authorized-officer'],

  // specs/web-seasons.md §3 — "le cas le mieux étayé du dépôt à ce jour":
  // roles-personas-as-caribbean.md lists "saisons" literally in the
  // Administrateur role's own description, and no other role. Narrowest
  // position ("moindre privilège"), same shape as 'backoffice:access' and
  // 'news:write' above — club-wide by construction (the 'admin'
  // RoleAssignment carries no scope field), so no matching scope check is
  // needed in can.ts. Deliberately NOT extending 'section:manage' to cover
  // this (§3, "à écarter explicitement") — a section-manager must never be
  // able to create or modify a season, which is unscoped club-wide reference
  // data that drives current_season() for every other role.
  // Mirrors 2 RLS policies on public.seasons (seasons_insert_admin,
  // seasons_update_admin) — see
  // supabase/migrations/20260917122358_web_seasons_write_policies.sql.
  'season:write': ['admin'],

  // specs/section-and-teams.md §3 — "['admin'] pour les deux actions,
  // l'élargissement de la seule action 'team:write' au Responsable de
  // section restant un arbitrage produit à trancher (PO-ST-05)". Club-wide
  // by construction (the 'admin' RoleAssignment carries no scope field), so
  // no matching scope check is needed in can.ts — same shape as
  // 'season:write'/'news:write' above. If PO-ST-05 ever widens 'team:write'
  // to 'section-manager', can.ts's 'section-manager' branch must be
  // extended in the SAME change (§3) — adding the role only here would let
  // a section-manager create/modify a team in ANY section, same trap as
  // 'convocation:create'.
  // Mirrors 4 RLS policies on public.sections/public.teams
  // (sections_insert_admin, sections_update_admin, teams_insert_admin,
  // teams_update_admin) — see
  // supabase/migrations/20260917140000_section_team_write_policies.sql.
  'section:write': ['admin'],
  // specs/team-opponents.md §3/AC-TO-07 — also gates "+ Adversaire" and
  // AddOpponentToTeamUseCase. Mirrored (manually) by the add_opponent_to_team()
  // function and the opponents_insert_admin / team_opponents_insert_admin
  // policies — supabase/migrations/20260930175109_add_opponent_to_team.sql.
  // Reminder (PO-TO-04): opponents_insert_admin stays bound to
  // private.is_admin(), it does NOT follow this action if widened.
  'team:write': ['admin'],

  // specs/section-and-teams.md §3 — "['admin'] n'est pas discutable" (CDC
  // "Gérer comptes, rôles, paramétrage" — ❌ for the seven other roles).
  // Club-wide by construction, same shape as the rows above — no scope
  // check needed in can.ts. The RLS `with check` clause is where the REAL
  // scope limit lives: not "any write to user_roles", only role='coach'
  // rows with team_id set and section_id null (AC-ST-33) — this matrix
  // entry alone does not and cannot express that column-level restriction.
  // Mirrors the single policy on public.user_roles
  // (user_roles_insert_assign_coach) — see
  // supabase/migrations/20260917140500_role_assign_coach_write_policy.sql.
  'role:assign-coach': ['admin'],

  // specs/web-memberships.md §3 — "Position retenue pour cette passe —
  // ['admin'], et pourquoi c'est un pis-aller assumé": 'backoffice:access'
  // already narrows /admin/* to 'admin' only (PO-WE-01, still open), so
  // granting 'payment:record' to 'treasurer' or 'membership:write' to
  // 'authorized-officer' here would build a right neither role could reach
  // through any route today. Both club-wide by construction (the 'admin'
  // RoleAssignment carries no scope field) — no matching scope check is
  // needed in can.ts, same shape as 'season:write'/'section:write' above.
  // PO-WM-08 stays open, explicitly flagged as "à trancher avant mise en
  // production" (not before conception): the CDC names Dirigeant habilité
  // and Trésorier for this module, and this ['admin']-only position is a
  // deliberate, acknowledged departure from that, not a reading of it.
  // Mirrors 2 RLS policies on public.memberships (memberships_insert_admin,
  // memberships_update_admin) and 1 on public.membership_payments
  // (membership_payments_insert_admin) — see
  // supabase/migrations/20260917174652_web_memberships_write_policies.sql.
  'membership:write': ['admin'],
  'payment:record': ['admin'],

  // specs/web-users.md §3 (amendement du 2026-09-18, PO-WU-01/02/03
  // résolus) — "le cas le plus simple du backoffice à ce jour": the CDC's
  // "Gérer comptes, rôles, paramétrage" row is ['admin'] with ❌ for the
  // seven other roles, no qualifier, the same shape as
  // 'backoffice:access'/'season:write' above (which 'backoffice:access'
  // already narrows to admin-only, PO-WE-01 still open). Club-wide by
  // construction (the 'admin' RoleAssignment carries no scope field) — no
  // matching scope check is needed in can.ts for 'user:invite'/'user:write'.
  //
  // Mirrors: NO RLS policy at all — public.users has no INSERT policy for
  // 'authenticated' (AC-WU-04); the invite-user Edge Function's own
  // server-side admin check (built from the caller's JWT under RLS, §2.5)
  // is the actual gate, this matrix entry only decides whether
  // presentation/ renders "+ Inviter un utilisateur" (AC-WU-19).
  'user:invite': ['admin'],

  // Mirrors users_update_admin (RLS UPDATE on public.users, `grant update
  // (full_name)` — column-restricted at the Postgres privilege level, never
  // able to touch email/charter_accepted_at/id/created_at/position, §2.7) —
  // see supabase/migrations/<timestamp>_web_users_write_policies.sql.
  'user:write': ['admin'],

  // §2.6d — a NEW action, sibling to 'role:assign-coach' above, NOT an
  // elargissement of it (see that action's own comment in actions.ts).
  // Mirrors user_roles_insert_assign_role (RLS INSERT on public.user_roles,
  // `with check`: private.is_admin() AND role IN the seven non-admin roles
  // — an explicit allow-list rather than `role <> 'admin'`, so a future
  // ninth role added to the table's own CHECK constraint isn't assignable
  // by default, §2.6b) — see
  // supabase/migrations/<timestamp>_web_users_write_policies.sql.
  // user_roles_insert_assign_coach itself is UNCHANGED — the two policies
  // are permissive and compose by OR, AssignCoachDialog/`/admin/teams` keep
  // consuming 'role:assign-coach' exactly as before (AC-WU-31).
  //
  // §2.6e/AC-WU-36 — 'role:assign' is a SCOPED action (targets a team or a
  // section), unlike every club-wide row above: see can.ts's
  // 'section-manager' branch, extended in THIS SAME change to compare
  // context.sectionId, even though today's ['admin']-only value means the
  // default branch (admin is club-wide by construction) is what actually
  // fires — written now so a future PO-WE-01 widening doesn't silently ship
  // without it, the exact gap already fixed three times for
  // 'convocation:create'/'attendance:validate'/'vote:cast'.
  //
  // specs/web-users-role-edit-remove.md §2.5a/AC-WU-45 (amendement du
  // 2026-09-18) — this entry now mirrors TWO RLS policies, NOT one:
  // user_roles_insert_assign_role (create, above) AND
  // user_roles_update_assign_role (scope edit — `using`/`with check`:
  // private.is_admin() AND the same seven-role whitelist; column-restricted
  // to team_id/section_id by `grant update (team_id, section_id)`, role/
  // user_id structurally unwritable) — see
  // supabase/migrations/<timestamp>_web_users_role_edit_remove_write_policies.sql.
  'role:assign': ['admin'],

  // specs/web-users-role-edit-remove.md §2.5b/AC-WU-45 (amendement du
  // 2026-09-18) — a NEW action, sibling to 'role:assign' above, not a
  // widening of it (see that action's own comment in actions.ts). Mirrors
  // user_roles_delete_remove_role (RLS DELETE on public.user_roles, `using`:
  // private.is_admin() AND the same seven-role whitelist as the UPDATE
  // policy above — a DELETE has no `with check`) — see
  // supabase/migrations/<timestamp>_web_users_role_edit_remove_write_policies.sql.
  //
  // §2.5c/AC-WU-47 — also a SCOPED action, jumeau exact of 'role:assign':
  // see can.ts's 'section-manager' branch, extended in THIS SAME change.
  'role:remove': ['admin'],

  // specs/match-stats.md §2 — exactly the role table that spec's §2 lays
  // out: Coach/Staff only for recording, Joueur/Joueuse + Coach/Staff for
  // reading goals, Coach/Staff only for the staff-only event types.
  // Deliberately NOT granted to 'section-manager'/'authorized-officer'/
  // 'admin' in this pass, even though the CDC's "dossiers des autres
  // membres" row would give the first two a ✅ on their own scope — §2's
  // own table calls this an assumed, bounded gap (PO-MS-01), not an
  // oversight, same shape as 'attendance:validate' leaving 'admin' out of
  // its matrix entry despite RLS still granting it there as a statu quo.
  // Every branch below is team-scoped — see can.ts's 'coach'/'player'
  // branches, extended in the SAME change to cover these three actions,
  // same "fix the gap now, not after the fact" reasoning already applied
  // to 'convocation:create'/'attendance:validate'/'vote:cast'.
  'match_result:record': ['coach'],
  'match_goals:view': ['player', 'coach'],
  'match_staff_events:view': ['coach'],

  // specs/edit-match-details.md §2 — "Décision de cadrage — ['coach'], et
  // pourquoi c'est un écart assumé": the CDC matrix row ("Créer/modifier une
  // convocation") actually grants ✅ to section-manager (their own section),
  // authorized-officer and admin too, unlike every other row this file
  // restricts by reading the matrix literally — this entry is a DELIBERATE,
  // documented NARROWING relative to the CDC, not a reading of it. Reasons
  // (all three, not just one): (1) the developer's own request names the
  // coach only; (2) none of the other three roles has any UI path to this
  // screen today — ConvocationDetailPage's variant switch
  // (useActiveRole()/hasActiveRoleForConvocation) only knows 'player' and
  // 'coach', so granting the write now would build a right nobody could
  // exercise; (3) moindre privilège — widening later costs one line, an
  // early over-grant costs a data correction. Widening to the other three
  // roles is PO-EM-01, explicitly open and explicitly NOT resolved here.
  //
  // Mirrors match_details_update_arrangements (RLS UPDATE on
  // public.match_details, `using`/`with check`: private.is_coach_of_team via
  // the parent convocation, c.date > now(), c.status = 'open') plus
  // `grant update (is_home, meeting_point_time, meeting_point_location)` —
  // see supabase/migrations/<timestamp>_edit_match_details_write_policy.sql.
  // Reading MatchDetails stays RLS-only, no matrix entry (unchanged,
  // match_details_select_team_scoped already exists) — this entry exists
  // only because presentation/ must decide whether to render the edit
  // control BEFORE any write is attempted (§2, "l'onglet Infos ne change pas
  // de structure selon le rôle, seul le contrôle d'édition apparaît ou
  // non").
  //
  // specs/web-create-convocation.md §2 — 'admin' ADDED (CDC row "Créer/modifier
  // une convocation" is ✅ for admin, which lifts PO-EM-01 for admin ONLY; the
  // coach scope and window are unchanged, section-manager/authorized-officer
  // stay out). Mirrors match_details_update_admin (same window: parent
  // convocation date > now() and status = 'open'), plus `grant update
  // (opponent_id)` — guarded against non-admin callers by the trigger
  // match_details_guard_opponent_admin_only (a column grant is per
  // (table, role), never per policy). Migration:
  // supabase/migrations/20261001120000_web_create_convocation.sql.
  'match_details:update': ['coach', 'admin'],

  // specs/edit-match-details.md, developer decision (2026-09-25) — same
  // scope as 'match_details:update' above (coach of the convocation's own
  // team, before kickoff): the coach may also correct the match's own
  // `date`/`location`. Mirrors convocations_update_arrangements (RLS UPDATE
  // on public.convocations, `using`/`with check`: private.is_coach_of_team
  // via team_id, c.date > now(), c.status = 'open') plus `grant update
  // (date, location)` — see
  // supabase/migrations/20260925150603_edit_match_details_write_policy.sql.
  //
  // specs/web-create-convocation.md §2 — 'admin' ADDED, same reasoning as
  // 'match_details:update' above. Mirrors convocations_update_admin (using/
  // with check: private.is_admin() and date > now() and status = 'open'),
  // plus `grant update (training_location_id)` guarded for non-admin callers
  // by convocations_guard_training_location_admin_only. Team and type stay
  // outside every grant. Migration:
  // supabase/migrations/20261001120000_web_create_convocation.sql.
  'convocation:update': ['coach', 'admin'],
  // Coach deletes an UPCOMING, open convocation of one of their own teams
  // (match detail screen's burger menu). Mirrors convocations_delete_coach
  // (RLS DELETE: private.is_coach_of_team(team_id) and date > now() and
  // status = 'open'). Migration:
  // supabase/migrations/20261003170000_coach_delete_convocation.sql.
  'convocation:delete': ['coach'],

  // specs/player-stats.md §2/§6.3 — "Deux actions nouvelles — et exactement
  // deux", the ONLY RBAC change this feature is allowed to make. Both scoped
  // to Joueur/Joueuse only, and both bounded to the PERSON, not a team: the
  // RPCs behind them (get_my_attendance_summary — SECURITY DEFINER, since
  // attendance_records' RLS stays closed to players; get_my_response_summary
  // — SECURITY INVOKER, since convocation_responses_select_own_or_coach
  // already grants a player SELECT on their own rows) filter on auth.uid()
  // internally and accept no parameter to falsify (AC-02). See can.ts's
  // 'player' branch: these two are DELIBERATELY NOT added to
  // requiresTeamScope (AC-PS-20) — there is no context.teamId for a
  // person-scoped action to compare against.
  'attendance:read-own-summary': ['player'],
  'response:read-own-summary': ['player'],

  // specs/player-stats.md addendum "PO-PS-03 tranché" (2026-09-29) — a
  // player reading their OWN yellow/red card rows. Required rewriting
  // match_events_select_scoped (previously a pure `event_type = 'goal'`
  // whitelist for the team-member branch) to add an own-row branch — see
  // supabase/migrations/20260929112002_player_stats_own_cards_rls.sql.
  // AC-MS-09/AC-MS-10 (no teammate's card visible to a player) are
  // UNCHANGED — the new branch only ever matches the row's own user_id.
  // Person-scoped like the two entries above, not team-scoped — see
  // can.ts's 'player' branch.
  'match_cards:view-own': ['player'],

  // specs/coach-team-stats.md §2 — "Seul rôle servi par cette passe.
  // Lecture, son équipe uniquement." Deliberately NOT extended to
  // section-manager/authorized-officer/admin in this pass, even though the
  // CDC's "Voir les dossiers des autres membres" row would give the first
  // two a ✅ on their own scope — an assumed, bounded gap (PO-CTS-05), same
  // shape as 'match_result:record'/'match_goals:view'/'match_staff_events:view'
  // leaving those three roles out despite a similar CDC reading. RLS is
  // unchanged either way (attendance_records_select_coach_admin already
  // grants admin, match_events_select_scoped is role-blind) — this row only
  // controls whether presentation/ renders the screen's entry point.
  // Mirrors NO new RLS policy (§2, "Aucune politique RLS nouvelle n'est
  // attendue de cette feature") — every read behind this screen reuses
  // attendance_records_select_coach_admin, match_events_select_scoped and
  // get_team_roster (this feature's own narrow SECURITY DEFINER RPC, scoped
  // the same way get_team_coaches already is).
  'team_stats:view': ['coach'],

  // specs/web-audit-logs.md §3 — "sept ❌ sans qualificatif, un ✅ sans
  // portée": the CDC matrix's own "Consulter le journal d'audit" row,
  // Administrateur only, no other role. Club-wide by construction (the
  // 'admin' RoleAssignment carries no scope field) — no matching scope
  // check is needed in can.ts, same shape as 'backoffice:access' above.
  // Deliberately the ONLY RBAC change this feature makes (AC-AU-20): no
  // widening of 'backoffice:access' itself, no other action, no other role.
  // Mirrors the single policy on public.audit_log
  // (audit_log_select_admin) — see
  // supabase/migrations/20260930090000_web_audit_logs_schema.sql.
  'audit:read': ['admin'],

  // specs/web-localizations.md §3 (PO-WL-02) — 'training_location:write':
  // ['admin'], club-wide, on the 'season:write' pattern. Covers add, edit
  // and archive (archiving goes through the update policy, there is no
  // delete). Manual mirror (CLAUDE.md §7) of 2 RLS policies on
  // public.training_locations (training_locations_insert_admin,
  // training_locations_update_admin), each commented with this action name —
  // see supabase/migrations/20261001100000_web_localizations.sql. Reading
  // locations stays RLS-only, no matrix entry (every authenticated account
  // reads them, archived included, to resolve a convocation's location).
  'training_location:write': ['admin'],

  // specs/web-mission-templates.md §3 — 'mission-template:manage': ['admin'],
  // club-wide (a deliberate tightening of the CDC "manage volunteer
  // missions" row, PO-MT-02). Manual mirror (CLAUDE.md §7) of the RLS
  // policies on public.mission_templates (mission_templates_select_admin,
  // mission_templates_insert_admin, mission_templates_update_admin), each
  // commented with this action name — see
  // supabase/migrations/20261002170000_web_mission_templates.sql. There is
  // no delete policy. Reading is admin-only RLS, no separate matrix entry.
  'mission-template:manage': ['admin'],

  // specs/coach-match-composition.md §2 — 'match_lineup:write': ['coach'],
  // scoped to the coach's own team (can.ts). Deliberate restrictive gap, same
  // as 'match_details:update' (PO-MC-10: section-manager/officer/admin not
  // built). Manual mirror (CLAUDE.md §7) of the write policies on
  // public.match_lineups / public.match_lineup_slots, each commented
  // 'match_lineup:write' — see supabase/migrations/20261001075331_match_lineup.sql.
  // Deliberately NO time window (PO-MC-05), unlike match_details_update_arrangements.
  'match_lineup:write': ['coach'],

  // specs/web-create-convocation.md §2 — NEW permission: the admin edits a
  // meeting's title and agenda before it starts. Admin only; club-wide by
  // construction (no scope field on the admin assignment). can.ts also lists
  // it in the 'coach' (requiresTeamScope) and 'section-manager' branches in
  // this same change, inert today, so a future widening can't ship without a
  // scope check. Mirrors meeting_details_update_admin (+ `revoke update` then
  // `grant update (title, agenda)`) — see
  // supabase/migrations/20261001120000_web_create_convocation.sql.
  'meeting_details:update': ['admin'],

  // specs/player-unavailability.md §2 — Coach/Staff only, own teams (can.ts).
  // SQL mirror: future migration, not built in the domain-only pass.
  'availability:declare': ['coach'],

  // Suspension only (kind = 'suspension'): coach (own teams, same as
  // 'availability:declare') and authorized-officer (club-wide, developer
  // decision). Medical stays coach-only. Mirrors unavailabilities_*_officer_suspension
  // (supabase/migrations/20261005120000_availability_write_officer.sql) and the
  // coach policies unavailabilities_insert_coach / unavailabilities_update_coach.
  'availability:declare-suspension': ['coach', 'authorized-officer'],

  // specs/player-unavailability.md §2 — player (own team) and coach (own
  // teams). Players see the teammate projection only. SQL mirror:
  // get_team_availability. Widened to 'authorized-officer' (developer
  // decision, Dirigeant availability screen): club-wide, no team scope in
  // can.ts (the `default` branch), teammate projection only — medical shown as
  // 'unavailable', no dates. Mirrors the officer branch of
  // get_team_availability (supabase/migrations/20261003150000_availability_read_officer.sql).
  'availability:read-team': ['player', 'coach', 'authorized-officer'],

  // specs/match-details-missions.md §3 — the only two entries of that feature.
  'mission:self-assign': ['player'],
  'mission:manage': ['coach', 'section-manager', 'authorized-officer', 'admin'],

  // specs/mobile-treasurer.md §3 (developer scope update) — read-only view of
  // every cotisation: treasurer (CDC "Voir le statut de cotisation"),
  // authorized-officer (developer decision, read mode only) and admin.
  // Club-wide, no scope check in can.ts. Mirrors the role check of
  // get_treasurer_dues() (`private.has_role('treasurer') or
  // private.has_role('authorized-officer') or private.is_admin()`) — see
  // supabase/migrations/20261005130000_get_treasurer_dues_rpc.sql. No write
  // or reminder action is added (PO-TR-01).
  'dues:read': ['treasurer', 'authorized-officer', 'admin'],
}
