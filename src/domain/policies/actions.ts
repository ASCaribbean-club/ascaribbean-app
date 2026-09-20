export type Action =
  | 'convocation:create'
  | 'convocation:respond'
  | 'section:manage'
  // specs/coach-attendance-confirmation.md §2/§7 — closes the mirroring
  // loop the initial migration's RLS comments already flagged as missing
  // ("no rbac-matrix.ts action exists for this yet [...] Follow-up:
  // rbac-matrix.ts / actions.ts should eventually gain an explicit
  // 'attendance:validate' action"). See attendance_records_insert_validate /
  // _update_validate in supabase/migrations/20260811171754_initial_schema.sql
  // for the RLS side this mirrors.
  | 'attendance:validate'
  // specs/player-vote.md §2 — "Action métier nouvelle proposée": the ONLY
  // matrix entry this feature needs. Reading vote results stays RLS-only,
  // deliberately without a matrix entry (§2, "La lecture des résultats
  // reste RLS-only, sans entrée de matrice" — the tab doesn't change
  // STRUCTURE per role, only the content returned does, same criterion
  // documented at the top of rbac-matrix.ts).
  // specs/player-vote.md §5 — PO-PV-01 (ASC Legacy attachment) and PO-PV-02
  // (the negative category, rejected) are both tranché (2026-09-16,
  // developer decision): this action and its matrix entry below back a real
  // write path (CastVoteUseCase), not scaffolding waiting on the Bureau.
  | 'vote:cast'
  // specs/web-empty-state.md §2 — "Entrée de matrice proposée": routing must
  // decide whether to render the backoffice shell at all, BEFORE any query
  // — and in this slice there is no query at all. That's exactly the
  // criterion this file's own matrix (rbac-matrix.ts) documents at its top
  // for when an action earns a row instead of staying RLS-only.
  | 'backoffice:access'
  // specs/web-actus.md §3 — "Entrée de matrice proposée": presentation/ must
  // decide whether to render "+ Nouvelle actu" and the per-row edit pencil,
  // independently of 'backoffice:access'. Deliberately a SEPARATE action
  // rather than reusing 'backoffice:access' for this decision too: the two
  // populations coincide today only "by calendar accident" (per that spec),
  // and PO-WE-01 may widen 'backoffice:access' without the Bureau ever
  // having validated that the same roles should write club_news — a
  // distinct action keeps that a two-step decision instead of a silent
  // side effect of the first one.
  | 'news:write'
  // specs/web-seasons.md §3 — "Entrée de matrice proposée": presentation/
  // must decide whether to render "+ Nouvelle saison" and the per-row edit
  // pencil, independently of 'backoffice:access' AND of 'section:manage'
  // (reusing the latter would silently let a section-manager, who is bounded
  // to their own section, create/modify a CLUB-WIDE reference row that
  // controls every other role's team visibility via current_season() —
  // §3/§4). Covers both create and update: no document distinguishes a role
  // that could do one without the other (§3).
  | 'season:write'
  // specs/section-and-teams.md §3 — two SEPARATE actions, not one generic
  // 'structure:write': creating a section is club-wide paramétrage
  // (Administrateur), while creating a team "in one's own section" is
  // exactly what PO-ST-05 leaves open for the Responsable de section — a
  // single action would make that future widening also open 'section:write'
  // by accident (same reasoning as 'news:write'/'season:write' staying
  // distinct from 'backoffice:access', §3 "Pourquoi deux actions et non une
  // seule"). Deliberately NOT reusing 'section:manage': its can.ts scope
  // check compares assignment.sectionId to context.sectionId, which has no
  // meaning on a CREATE (the section doesn't exist yet) — see §3 "à écarter
  // explicitement".
  | 'section:write'
  | 'team:write'
  // specs/section-and-teams.md §2.9/§3 — the resource actually WRITTEN by
  // this action is public.user_roles, never public.teams/public.sections
  // (assigning a coach inserts a user_roles row, §2.9). Named
  // 'role:assign-coach' rather than the generic 'role:assign'/'user:write'
  // (which would silently cover assigning 'admin' itself — elevation of
  // privilege, and the six other roles, none of which this screen's "+
  // Coach" entry point offers) and rather than 'team:assign-coach' (which
  // would name the WRONG resource and invite a future contributor to fold
  // it into 'team:write' by prefix proximity — §3, "Retenu —
  // 'role:assign-coach'"). The 'coach' suffix is the only scope an RLS
  // `with check` can verify literally (`role = 'coach'`, AC-ST-33).
  | 'role:assign-coach'
  // specs/web-memberships.md §3 — TWO separate actions, not one generic
  // 'membership:pay' or similar: the RBAC matrix (CDC) itself splits this
  // screen's two natures ("dossier d'adhérent" vs. "financier"), and their
  // candidate populations diverge the moment PO-WE-01/PO-WM-08 are ever
  // resolved (Dirigeant habilité on the dossier side, Trésorier on the
  // payment side) — a single action would make that future widening grant
  // BOTH rights in the same change, exactly the silent side effect
  // 'section:write'/'team:write' staying distinct was built to avoid.
  // Named 'membership:write' for the memberships row itself (dossier:
  // licence, statut, valid_until — create/update/archive, all three share
  // this one action, §3 "Ce n'est pas de la symétrie décorative").
  | 'membership:write'
  // specs/web-memberships.md §3 — names the resource ACTUALLY written (a
  // row in the new payments child table), never 'membership:pay': the verb
  // 'record' says what this action really does — constate un encaissement
  // déjà survenu, jamais encaisser en ligne (§1, P2/CDC "sans encaissement
  // en ligne").
  | 'payment:record'
  // specs/web-users.md §2.5/§3 (amendement du 2026-09-18, PO-WU-01 résolu) —
  // names the actual privileged operation ("inviter un compte"), never
  // 'user:write' below (which names an UPDATE on public.users, a different
  // right on the same table — same "two separate actions" reasoning as
  // 'section:write'/'team:write' and 'membership:write'/'payment:record'
  // above). presentation/ needs this to decide whether to render "+
  // Inviter un utilisateur" BEFORE any query, same criterion as
  // 'backoffice:access'. Mirrors the invite-user Edge Function's own
  // server-side admin check (§2.5, AC-WU-32) — the RLS side of this action
  // is "no INSERT policy exists on public.users at all" (AC-WU-04): the
  // Edge Function's service_role client is the only writer.
  | 'user:invite'
  // specs/web-users.md §2.7/§3 (PO-WU-02 résolu) — the "Modifier
  // l'utilisateur" pencil/dialog. Names public.users, the table actually
  // written (full_name only, AC-WU-38) — never 'role:assign' below, which
  // writes a DIFFERENT table (public.user_roles). Mirrors the
  // users_update_admin RLS policy (supabase/migrations, "web_users" write
  // policies) — column-restricted to full_name at the grant level, §2.7.
  | 'user:write'
  // specs/web-users.md §2.6/§3 (PO-WU-03 résolu) — the generalized "+ Rôle"
  // dialog on /admin/users, offering seven roles, 'admin' EXCLUDED always
  // (AC-WU-05/AC-WU-06). A brand-new action, NOT an elargissement of
  // 'role:assign-coach' above: that action's own comment ("the 'coach'
  // suffix is the only scope an RLS `with check` can verify literally")
  // would become false if 'role:assign-coach' started covering every role,
  // and AssignCoachDialog/`/admin/teams` must keep consuming
  // 'role:assign-coach' completely unchanged (AC-WU-31) — two actions, two
  // RLS policies (user_roles_insert_assign_coach unchanged,
  // user_roles_insert_assign_role added as a SIBLING, §2.6b), never one
  // widened in place. Names the resource actually written
  // (public.user_roles), same naming reasoning as 'role:assign-coach'
  // itself, never 'user:write' (a different table, §2.7 above).
  //
  // specs/web-users-role-edit-remove.md §2.5a/AC-WU-45 (amendement du
  // 2026-09-18) — EXTENDED, not renamed, not duplicated: this action now
  // mirrors TWO RLS policies, user_roles_insert_assign_role (create,
  // unchanged) AND user_roles_update_assign_role (scope edit, new). Same
  // precedent already applied twice in this repo — 'membership:write'
  // covers memberships_insert_admin AND memberships_update_admin,
  // 'season:write' covers create and update with the same "no document
  // distinguishes a role that could do one without the other" reasoning.
  // No document distinguishes a role that could assign a role without also
  // being able to correct its scope, so a second 'role:edit-scope' action
  // would invent a distinction nothing supports.
  | 'role:assign'
  // specs/web-users-role-edit-remove.md §2.5b/AC-WU-45 (amendement du
  // 2026-09-18) — a NEW, distinct action for REMOVAL, not folded into
  // 'role:assign' above despite the 'membership:write' precedent just cited:
  // this is a genuine DELETE, the first one this codebase opens to a
  // client at all (public.user_roles carries no archived_at/timestamp/
  // author, PO-WU-08 — nothing survives it, unlike an archived membership,
  // which keeps its payment history). The two rights could also widen
  // separately one day (PO-WE-01) — exactly the effect
  // 'section:write'/'team:write' and 'membership:write'/'payment:record'
  // stay split to avoid. Names the resource actually written
  // (public.user_roles), same reasoning as 'role:assign'/'role:assign-coach'
  // — never 'user:write' (a different table, §2.7 of web-users.md).
  | 'role:remove'
