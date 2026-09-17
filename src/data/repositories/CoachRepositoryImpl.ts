import type { SupabaseClient } from '@supabase/supabase-js'
import type { CoachRepository, TeamCoach, TeamCoachAssignment } from '@domain/repositories/coach-repository'
import type { CoachAssignmentDto } from '@data/dto/coach-assignment-dto'
import type { CoachDto } from '@data/dto/coach-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toTeamCoachAssignment } from '@data/mappers/coach-assignment-mapper'
import { toTeamCoach } from '@data/mappers/coach-mapper'

export class CoachRepositoryImpl implements CoachRepository {
  constructor(private readonly client: SupabaseClient) {}

  // get_team_coaches (supabase/migrations/20260904083306_profile_team_
  // coaches.sql) is the actual authorization boundary here — an out-of-scope
  // teamId (caller isn't a member) resolves to an empty array server-side,
  // not an error, matching listForConvocation's own "no existence leak" shape.
  async listForTeam(teamId: string): Promise<TeamCoach[]> {
    const { data, error } = await this.client.rpc('get_team_coaches', { p_team_id: teamId })

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as CoachDto[]).map(toTeamCoach)
  }

  // specs/section-and-teams.md §2.11/AC-ST-41 — plain PostgREST embed, NOT
  // a SECURITY DEFINER RPC like listForTeam() above: the admin branch of
  // user_roles_select_own/users_select_own already lets an admin session
  // read every row of both tables unrestricted, so a bypass function would
  // be exactly the "fonction security definer qui contournerait la RLS"
  // AC-ST-08/AC-ST-35 forbid. `users!inner(full_name)` forces an inner join
  // so a role='coach' row somehow missing its user (shouldn't happen, see
  // the DTO's own comment) is excluded server-side rather than mapped with
  // a null name — belt-and-braces alongside the mapper's own null guard.
  async listAllAssignments(): Promise<TeamCoachAssignment[]> {
    const { data, error } = await this.client
      .from('user_roles')
      .select('team_id, user_id, users!inner(full_name)')
      .eq('role', 'coach')
      .overrideTypes<CoachAssignmentDto[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toTeamCoachAssignment).filter((assignment) => assignment !== null)
  }
}
