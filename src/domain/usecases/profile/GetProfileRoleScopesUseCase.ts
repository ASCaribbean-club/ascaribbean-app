import { distinctRoles, isCoach, isPlayer, isSectionManager, type Role, type RoleAssignment } from '../../entities/user'
import type { Section } from '../../entities/section'
import type { Team } from '../../entities/team'
import type { CoachRepository } from '../../repositories/coach-repository'
import type { SeasonRepository } from '../../repositories/season-repository'
import type { SectionRepository } from '../../repositories/section-repository'
import type { TeamRepository } from '../../repositories/team-repository'

// One resolved scope per DISTINCT role (PR-1, specs/profile-page.md §1) —
// `scopeLines` is already just the plain resolved names (team/section
// names), never a label prefix ("Équipe", "Section"...): the label per
// role is a display concern the presentation layer owns
// (RoleScopeBlock), not a domain fact this use case should bake in.
//
// `coachNames` — 2026-09-04 addendum, resolves "who coaches my team" for
// the player role only (empty array for every other role, same "empty not
// omitted" convention as scopeLines). Kept separate from scopeLines rather
// than appended to it: scopeLines are the role's OWN scope (team/section the
// role is assigned to), coachNames are a fact about someone ELSE (the
// narrow, explicit AC-01/AC-02 exception, see specs/profile-page.md
// addendum) — mixing the two into one array would make it impossible for
// the presentation layer to label them differently.
//
// `sectionNames`/`seasonLabel` — developer follow-up request on top of that
// addendum: the player's own team already carries `sectionId`/`seasonId`
// (domain/entities/team.ts), previously fetched by resolveTeamNames but
// discarded after reading `.name`. Resolved here for the player role only,
// same "own scope, not a third party" reasoning as scopeLines — unlike
// coachNames this data is entirely the player's own team's, no AC-01/AC-02
// exception involved. `seasonLabel` is singular (not an array like
// scopeLines/sectionNames): TeamRepository.findByIds already scopes every
// resolved team to the CURRENT season only (see its own migration-referencing
// comment), so a player's teams never straddle two different seasons — one
// label, not per-team ones. Both stay empty/null for every other role, same
// convention as coachNames.
export interface ProfileRoleScope {
  role: Role
  scopeLines: string[]
  coachNames: string[]
  sectionNames: string[]
  seasonLabel: string | null
}

export interface GetProfileRoleScopesInput {
  roles: RoleAssignment[]
}

export class GetProfileRoleScopesUseCase {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly sectionRepository: SectionRepository,
    private readonly coachRepository: CoachRepository,
    private readonly seasonRepository: SeasonRepository,
  ) { }

  execute(input: GetProfileRoleScopesInput): Promise<ProfileRoleScope[]> {
    return Promise.all(
      distinctRoles(input.roles).map((role) =>
        role === 'player' ? this.resolvePlayerScope(input.roles) : this.resolveOtherScope(role, input.roles),
      ),
    )
  }

  // Every non-player role: no coach/section/season resolution — that data is
  // either meaningless for these roles (a coach doesn't need "who coaches my
  // team", they are the coach) or was never asked for beyond player (this
  // developer follow-up, per its own comment above, scoped to player only).
  private async resolveOtherScope(role: Role, assignments: RoleAssignment[]): Promise<ProfileRoleScope> {
    const scopeLines = await this.resolveScopeLines(role, assignments)
    return { role, scopeLines, coachNames: [], sectionNames: [], seasonLabel: null }
  }

  private resolveScopeLines(role: Role, assignments: RoleAssignment[]): Promise<string[]> {
    switch (role) {
      case 'coach':
        return this.resolveTeamNames(assignments.filter(isCoach).flatMap((a) => a.teamIds))
      case 'section-manager':
        return this.resolveSectionNames(assignments.filter(isSectionManager).map((a) => a.sectionId))
      default:
        return Promise.resolve([])
    }
  }

  // Player only — fetches full Team objects (not just names) once, since
  // scopeLines/sectionNames/seasonLabel all derive from the same rows;
  // fetching them separately per field would triple the same round trip.
  private async resolvePlayerScope(assignments: RoleAssignment[]): Promise<ProfileRoleScope> {
    const teamIds = assignments.filter(isPlayer).map((a) => a.teamId)

    const [teams, coachNames, season] = await Promise.all([
      this.teamRepository.findByIds(teamIds),
      this.resolveCoachNames(teamIds),
      this.seasonRepository.findCurrent(),
    ])

    const sectionIds = Array.from(new Set(teams.map((team) => team.sectionId)))
    const sections = await Promise.all(sectionIds.map((id) => this.sectionRepository.findById(id)))

    return {
      role: 'player',
      scopeLines: teams.map((team: Team) => team.name),
      coachNames,
      sectionNames: sections.filter((section): section is Section => section !== null).map((section) => section.name),
      // A gap between two seasons (SeasonRepository.findCurrent's own
      // documented "valid state, not an error") means no season to name —
      // same null-not-error treatment GetProfileMembershipUseCase already
      // applies to the identical case.
      seasonLabel: season?.label ?? null,
    }
  }

  private async resolveTeamNames(teamIds: string[]): Promise<string[]> {
    const teams = await this.teamRepository.findByIds(teamIds)
    return teams.map((team) => team.name)
  }

  private async resolveSectionNames(sectionIds: string[]): Promise<string[]> {
    const sections = await Promise.all(sectionIds.map((id) => this.sectionRepository.findById(id)))
    return sections.filter((section): section is Section => section !== null).map((section) => section.name)
  }

  private async resolveCoachNames(teamIds: string[]): Promise<string[]> {
    const coachesPerTeam = await Promise.all(teamIds.map((teamId) => this.coachRepository.listForTeam(teamId)))
    const uniqueById = new Map(coachesPerTeam.flat().map((coach) => [coach.id, coach]))
    return Array.from(uniqueById.values()).map((coach) => coach.fullName)
  }
}
