import { describe, expect, it } from 'vitest'
import { addMonths, buildMonthGrid, monthRange, startOfMonth } from './calendar-grid'

const get = (item: { date: string }) => item.date

describe('calendar-grid', () => {
  it('starts weeks on Monday and pads to full weeks', () => {
    // October 2026 starts on a Thursday: 3 leading days, 31 days, 35 cells.
    const cells = buildMonthGrid(new Date(2026, 9, 15), [], get, new Date(2026, 9, 1))
    expect(cells).toHaveLength(35)
    expect(cells.slice(0, 3).every((cell) => !cell.inMonth)).toBe(true)
    expect(cells[3]).toMatchObject({ day: 1, inMonth: true })
  })

  it('places items on their local day, sorted by time, and flags today', () => {
    const late = { date: new Date(2026, 9, 6, 18, 0).toISOString() }
    const early = { date: new Date(2026, 9, 6, 9, 0).toISOString() }
    const cells = buildMonthGrid(new Date(2026, 9, 1), [late, early], get, new Date(2026, 9, 6))
    const day = cells.find((cell) => cell.inMonth && cell.day === 6)!
    expect(day.items).toEqual([early, late])
    expect(day.isToday).toBe(true)
  })

  it('computes a [from, to) range covering exactly the month', () => {
    const { from, to } = monthRange(new Date(2026, 9, 20))
    expect(new Date(from)).toEqual(new Date(2026, 9, 1))
    expect(new Date(to)).toEqual(new Date(2026, 10, 1))
  })

  it('navigates across year boundaries', () => {
    expect(addMonths(startOfMonth(new Date(2026, 11, 5)), 1)).toEqual(new Date(2027, 0, 1))
    expect(addMonths(new Date(2027, 0, 1), -1)).toEqual(new Date(2026, 11, 1))
  })
})
