import type { AttendanceRecord } from '../entities/convocation'

export interface AttendanceRecordRepository {
  upsert(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord>
  findByConvocation(convocationId: string): Promise<AttendanceRecord[]>
}
