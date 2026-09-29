import { describe, expect, it, vi } from 'vitest'
import type { AttendanceTypeBreakdown } from '@domain/entities/attendance-summary'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import { GetOwnAttendanceSummaryByTypeUseCase } from './GetOwnAttendanceSummaryByTypeUseCase'

function fakeAttendanceRecordRepository(overrides: Partial<AttendanceRecordRepository> = {}): AttendanceRecordRepository {
  return {
    upsert: async (record) => ({ id: 'attendance-1', ...record }),
    findByConvocation: async () => [],
    getOwnAttendanceSummary: async () => ({ validatedCount: 0, presentCount: 0 }),
    getOwnAttendanceSummaryByType: async () => [],
    ...overrides,
  }
}

describe('GetOwnAttendanceSummaryByTypeUseCase', () => {
  it('delegates to AttendanceRecordRepository.getOwnAttendanceSummaryByType with no argument (AC-02 — no userId to falsify)', async () => {
    const getOwnAttendanceSummaryByType = vi.fn(
      async () => [{ type: 'training', validatedCount: 8, presentCount: 6 }] as AttendanceTypeBreakdown[],
    )
    const useCase = new GetOwnAttendanceSummaryByTypeUseCase(fakeAttendanceRecordRepository({ getOwnAttendanceSummaryByType }))

    const result = await useCase.execute()

    expect(getOwnAttendanceSummaryByType).toHaveBeenCalledExactlyOnceWith()
    expect(result).toEqual([{ type: 'training', validatedCount: 8, presentCount: 6 }])
  })

  it('returns an empty array as-is when no type has a validated session yet (AC-PS-26 — no 0/0 row)', async () => {
    const useCase = new GetOwnAttendanceSummaryByTypeUseCase(fakeAttendanceRecordRepository())

    await expect(useCase.execute()).resolves.toEqual([])
  })
})
