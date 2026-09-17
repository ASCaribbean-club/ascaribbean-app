import { describe, expect, it } from 'vitest'
import type { CreateSectionInput, UpdateSectionInput } from '@domain/repositories/section-repository'
import type { SectionRow } from '../dto/section-dto'
import { toSection, toSectionInsertRow, toSectionUpdateRow } from './section-mapper'

describe('toSection', () => {
  it('maps every column', () => {
    const row: SectionRow = { id: 'section-1', name: 'Senior masculin', type: 'football', created_at: '2026-01-01T00:00:00.000Z' }

    expect(toSection(row)).toEqual({
      id: 'section-1',
      name: 'Senior masculin',
      type: 'football',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })
})

describe('toSectionInsertRow', () => {
  it('maps every field to its snake_case column, and never includes id/created_at', () => {
    const input: CreateSectionInput = { name: 'Senior masculin', type: 'football' }
    const row = toSectionInsertRow(input)

    expect(row).toEqual({ name: 'Senior masculin', type: 'football' })
    expect(row).not.toHaveProperty('id')
    expect(row).not.toHaveProperty('created_at')
  })
})

describe('toSectionUpdateRow', () => {
  it('maps every field to its snake_case column, and never includes id/created_at', () => {
    const input: UpdateSectionInput = { name: 'Senior féminin', type: 'esport' }
    const row = toSectionUpdateRow(input)

    expect(row).toEqual({ name: 'Senior féminin', type: 'esport' })
    expect(row).not.toHaveProperty('id')
    expect(row).not.toHaveProperty('created_at')
  })
})
