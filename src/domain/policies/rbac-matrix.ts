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
  'attendance:validate': ['coach'],

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
  'news:write': ['admin'],

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
  'match_details:update': ['coach'],

  // specs/edit-match-details.md, developer decision (2026-09-25) — same
  // scope as 'match_details:update' above (coach of the convocation's own
  // team, before kickoff): the coach may also correct the match's own
  // `date`/`location`. Mirrors convocations_update_arrangements (RLS UPDATE
  // on public.convocations, `using`/`with check`: private.is_coach_of_team
  // via team_id, c.date > now(), c.status = 'open') plus `grant update
  // (date, location)` — see
  // supabase/migrations/20260925150603_edit_match_details_write_policy.sql.
  'convocation:update': ['coach'],
}
