import type { SupabaseClient } from '@supabase/supabase-js'
import type { AttendanceSummary, AttendanceTypeBreakdown } from '@domain/entities/attendance-summary'
import type { AttendanceRecord } from '@domain/entities/convocation'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import type { AttendanceRecordRow } from '../dto/attendance-record-dto'
import type { AttendanceSummaryByTypeDto } from '../dto/attendance-summary-by-type-dto'
import type { AttendanceSummaryDto } from '../dto/attendance-summary-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toAttendanceRecord, toAttendanceRecordRow } from '../mappers/attendance-record-mapper'
import { toAttendanceTypeBreakdown } from '../mappers/attendance-summary-by-type-mapper'
import { toAttendanceSummary } from '../mappers/attendance-summary-mapper'

// `public.attendance_records` — table + RLS already exist (migration
// 20260811171754_initial_schema.sql: attendance_records_select_coach_admin /
// _insert_validate / _update_validate). specs/coach-attendance-confirmation.md
// §1, "réellement nouveau" — this repository implementation is net-new: the
// domain interface (domain/repositories/attendance-record-repository.ts)
// had no implementation anywhere in the repo before this pass.
export class AttendanceRecordRepositoryImpl implements AttendanceRecordRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async upsert(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    const { data, error } = await this.client
      .from('attendance_records')
      .upsert(toAttendanceRecordRow(record), { onConflict: 'convocation_id,user_id' })
      .select()
      .single<AttendanceRecordRow>()

    if (error) throw mapSupabaseError(error)

    return toAttendanceRecord(data as AttendanceRecordRow)
  }

  async findByConvocation(convocationId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await this.client
      .from('attendance_records')
      .select('id, convocation_id, user_id, actual_status, absence_validity, note, validated_by, validated_at')
      .eq('convocation_id', convocationId)
      .overrideTypes<AttendanceRecordRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toAttendanceRecord)
  }

  // specs/player-stats.md §6.3/PO-PS-02 — get_my_attendance_summary(),
  // SECURITY DEFINER (supabase/migrations/20260928120000_player_stats_summary_rpcs.sql).
  // No parameter: the RPC filters on auth.uid() internally (AC-02). `single()`
  // is safe here — the function has no GROUP BY, so it always returns
  // exactly one aggregate row, even for a caller with zero attendance_records
  // (COUNT(*) over zero rows is still one row, with 0).
  async getOwnAttendanceSummary(): Promise<AttendanceSummary> {
    const { data, error } = await this.client.rpc('get_my_attendance_summary').single<AttendanceSummaryDto>()

    if (error) throw mapSupabaseError(error)

    return toAttendanceSummary(data as AttendanceSummaryDto)
  }

  // specs/player-stats.md addendum "troisième passage" (PO-PS-12
  // partiellement tranché) — get_my_attendance_summary_by_type(), SECURITY
  // DEFINER, same auth.uid() boundary as getOwnAttendanceSummary above. No
  // `.single()` here: unlike the global aggregate, this RPC has a `GROUP BY`
  // and returns ZERO rows for a caller with no validated attendance record
  // of any type yet (AC-PS-26/27) — a real, expected empty array, not an
  // error.
  async getOwnAttendanceSummaryByType(): Promise<AttendanceTypeBreakdown[]> {
    const { data, error } = await this.client.rpc('get_my_attendance_summary_by_type')

    if (error) throw mapSupabaseError(error)

    return ((data ?? []) as AttendanceSummaryByTypeDto[]).map(toAttendanceTypeBreakdown)
  }
}
