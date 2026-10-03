import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminConvocationFilters, AdminConvocationListItem, AdminConvocationPage } from '@domain/entities/admin-convocation'
import { ADMIN_CONVOCATION_PAGE_SIZE, type AdminConvocationRepository } from '@domain/repositories/admin-convocation-repository'
import type { AdminConvocationDto } from '../dto/admin-convocation-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toAdminConvocationListItem } from '../mappers/admin-convocation-mapper'

// specs/web-create-convocation.md — one PostgREST query per page, joins
// embedded (team + roster roles, match/meeting satellites, creator, attendance
// rows), so the expandable panel needs no second request. `teams!inner` makes
// the season/section/team filters server-side (AC-WC-06). Runs under the
// caller's RLS: admin reads everything, every other role only its own scope
// (AC-WC-01), nothing here widens that.
const ADMIN_CONVOCATION_COLUMNS = [
  'id, team_id, type, date, location, training_location_id, status, closed_at, closed_by,',
  'cancelled_at, cancelled_by, cancellation_reason, created_by, created_at,',
  'training_location:training_locations(id, name, address, is_archived),',
  'teams!inner(id, name, section_id, season_id, user_roles(role)),',
  'match_details(opponent_id, is_home, meeting_point_time, meeting_point_location, opponents(name)),',
  'meeting_details(title, agenda),',
  'users!created_by(full_name),',
  'attendance_records(actual_status)',
].join(' ')

export class AdminConvocationRepositoryImpl implements AdminConvocationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(filters: AdminConvocationFilters, page: number, now: Date): Promise<AdminConvocationPage> {
    const from = page * ADMIN_CONVOCATION_PAGE_SIZE

    let query = this.client.from('convocations').select(ADMIN_CONVOCATION_COLUMNS)

    if (filters.seasonId) query = query.eq('teams.season_id', filters.seasonId)
    if (filters.sectionId) query = query.eq('teams.section_id', filters.sectionId)
    if (filters.teamId) query = query.eq('team_id', filters.teamId)
    if (filters.type) query = query.eq('type', filters.type)

    if (filters.dateRange) query = query.gte('date', filters.dateRange.from).lt('date', filters.dateRange.to)

    const nowIso = now.toISOString()
    // Mirrors isConvocationEditable's strict `>` and canEnterAttendance's `<=`.
    if (filters.period === 'upcoming') query = query.gt('date', nowIso)
    if (filters.period === 'past') query = query.lte('date', nowIso)
    // PO-WC-04 definition, shared with countUnrecorded (AC-WC-09) and
    // isAttendancePending: not cancelled, date passed, still 'open'.
    if (filters.unrecordedOnly) query = query.eq('status', 'open').lte('date', nowIso)

    // One extra row tells whether another page exists, without a count query.
    const { data, error } = await query
      .order('date', { ascending: false })
      .range(from, from + ADMIN_CONVOCATION_PAGE_SIZE)
      .overrideTypes<AdminConvocationDto[]>()

    if (error) throw mapSupabaseError(error)

    const rows = data ?? []
    return {
      items: rows.slice(0, ADMIN_CONVOCATION_PAGE_SIZE).map(toAdminConvocationListItem),
      hasMore: rows.length > ADMIN_CONVOCATION_PAGE_SIZE,
    }
  }

  async countUnrecorded(seasonId: string | null, now: Date): Promise<number> {
    let query = this.client
      .from('convocations')
      .select('id, teams!inner(season_id)', { count: 'exact', head: true })
      .eq('status', 'open')
      .lte('date', now.toISOString())

    if (seasonId) query = query.eq('teams.season_id', seasonId)

    const { count, error } = await query
    if (error) throw mapSupabaseError(error)
    return count ?? 0
  }

  async findById(convocationId: string): Promise<AdminConvocationListItem | null> {
    const { data, error } = await this.client
      .from('convocations')
      .select(ADMIN_CONVOCATION_COLUMNS)
      .eq('id', convocationId)
      .maybeSingle<AdminConvocationDto>()

    if (error) throw mapSupabaseError(error)
    return data ? toAdminConvocationListItem(data) : null
  }
}
