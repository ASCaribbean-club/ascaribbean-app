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
}
