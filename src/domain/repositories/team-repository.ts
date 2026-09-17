import type { Team } from '../entities/team'

// specs/section-and-teams.md §2.7/AC-ST-12 — "Une seule interface par
// ressource, pas de BackofficeTeamRepository séparé". findByIds()/findById()/
// countActiveMembers() are kept EXACTLY as they were, in both signature and
// behaviour (AC-ST-25) — their filter on the current season backs AC-CD-01
// and must not regress. findAllForAdmin()/create()/update() are new, added
// here rather than on a second interface.
export interface TeamRepository {
  findByIds(ids: string[]): Promise<Team[]>
  countActiveMembers(teamId: string): Promise<number>
  findById(id: string): Promise<Team | null>

  // specs/section-and-teams.md §2.7/AC-ST-13 — the /admin/teams and
  // /admin/sections admin lists. Deliberately NOT named findAll(), to keep
  // it visually distinct at every call site from findByIds()/findById()'s
  // current-season filter: this read applies NO season filter at all
  // (returns every team, every season, including a summer gap where
  // current_season() resolves to nothing — a valid state, not an error).
  // Backed by teams_select_team_scoped's `or private.is_admin()` branch,
  // which is deliberately unrestricted by season (AC-ST-02) — no new RLS
  // policy needed for this read (§2.6).
  findAllForAdmin(): Promise<Team[]>

  // CreateTeamUseCase is the only caller, never presentation/ directly
  // (AC-ST-14/AC-ST-31).
  create(input: CreateTeamInput): Promise<Team>

  // UpdateTeamUseCase is the only caller. Targets the SAME row (AC-ST-24) —
  // no "ended season" restriction exists for a team update (§2.6, not
  // extended by analogy with seasons_update_admin; PO-ST-04 leaves what's
  // editable on a team open beyond "it exists").
  update(id: string, input: UpdateTeamInput): Promise<Team>
}

// Mirrors the entity minus what the database always derives itself (id).
export type CreateTeamInput = Omit<Team, 'id'>

// Same 3 fields as CreateTeamInput — a team has nothing else to update
// (§2.1, no audit columns exist yet, PO-ST-03).
export type UpdateTeamInput = Omit<Team, 'id'>
