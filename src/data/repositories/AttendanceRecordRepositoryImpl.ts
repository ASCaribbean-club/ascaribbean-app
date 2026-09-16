import type { SupabaseClient } from '@supabase/supabase-js'
import type { AttendanceRecord } from '@domain/entities/convocation'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import type { AttendanceRecordRow } from '../dto/attendance-record-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toAttendanceRecord, toAttendanceRecordRow } from '../mappers/attendance-record-mapper'

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
}
