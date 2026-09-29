import { describe, expect, it, vi } from 'vitest'
import type { AttendanceSummary } from '@domain/entities/attendance-summary'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import { GetOwnAttendanceSummaryUseCase } from './GetOwnAttendanceSummaryUseCase'

function fakeAttendanceRecordRepository(overrides: Partial<AttendanceRecordRepository> = {}): AttendanceRecordRepository {
  return {
    upsert: async (record) => ({ id: 'attendance-1', ...record }),
    findByConvocation: async () => [],
    getOwnAttendanceSummary: async () => ({ validatedCount: 0, presentCount: 0 }),
    getOwnAttendanceSummaryByType: async () => [],
    ...overrides,
  }
}

describe('GetOwnAttendanceSummaryUseCase', () => {
  it("delegates to AttendanceRecordRepository.getOwnAttendanceSummary with no argument (AC-02 — no userId to falsify)", async () => {
    const getOwnAttendanceSummary = vi.fn(async () => ({ validatedCount: 12, presentCount: 9 }) as AttendanceSummary)
    const useCase = new GetOwnAttendanceSummaryUseCase(fakeAttendanceRecordRepository({ getOwnAttendanceSummary }))

    const result = await useCase.execute()

    expect(getOwnAttendanceSummary).toHaveBeenCalledExactlyOnceWith()
    expect(result).toEqual({ validatedCount: 12, presentCount: 9 })
  })

  it('returns a zero-denominator summary as-is, unmodified (AC-PS-17 is handled by the policy, not here)', async () => {
    const useCase = new GetOwnAttendanceSummaryUseCase(fakeAttendanceRecordRepository())

    await expect(useCase.execute()).resolves.toEqual({ validatedCount: 0, presentCount: 0 })
  })
})
