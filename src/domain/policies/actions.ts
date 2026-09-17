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
