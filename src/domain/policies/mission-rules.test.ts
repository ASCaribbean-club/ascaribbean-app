import { describe, expect, it } from 'vitest'
import {
  isEligibleMissionAssignee,
  isValidMissionCapacity,
  isValidMissionDescription,
  isValidMissionLabel,
  MAX_MISSION_CAPACITY,
  MAX_MISSION_DESCRIPTION_LENGTH,
  MIN_MISSION_CAPACITY,
  normalizeMissionDescription,
} from './mission-rules'

describe('mission capacity bounds', () => {
  it('are 1 and 3', () => {
    expect(MIN_MISSION_CAPACITY).toBe(1)
    expect(MAX_MISSION_CAPACITY).toBe(3)
  })
})

describe('isValidMissionCapacity', () => {
  it.each([1, 2, 3])('accepts %d', (capacity) => {
    expect(isValidMissionCapacity(capacity)).toBe(true)
  })

  it.each([0, 4, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects %d', (capacity) => {
    expect(isValidMissionCapacity(capacity)).toBe(false)
  })
})

describe('isValidMissionLabel', () => {
  it.each(['', '   ', '\t\n'])('rejects %j', (label) => {
    expect(isValidMissionLabel(label)).toBe(false)
  })

  it('accepts a label surrounded by spaces', () => {
    expect(isValidMissionLabel('  Apporter l’eau  ')).toBe(true)
  })
})

describe('isValidMissionDescription', () => {
  it('has a maximum of 500', () => {
    expect(MAX_MISSION_DESCRIPTION_LENGTH).toBe(500)
  })

  it('accepts null, a short text, and exactly the maximum length', () => {
    expect(isValidMissionDescription(null)).toBe(true)
    expect(isValidMissionDescription('Détails')).toBe(true)
    expect(isValidMissionDescription('a'.repeat(500))).toBe(true)
  })

  it('rejects one character over the maximum', () => {
    expect(isValidMissionDescription('a'.repeat(501))).toBe(false)
  })
})

describe('normalizeMissionDescription', () => {
  it('trims, and turns blank, whitespace-only, null and undefined into null', () => {
    expect(normalizeMissionDescription('  Détails ')).toBe('Détails')
    expect(normalizeMissionDescription('')).toBeNull()
    expect(normalizeMissionDescription('   ')).toBeNull()
    expect(normalizeMissionDescription(null)).toBeNull()
    expect(normalizeMissionDescription(undefined)).toBeNull()
  })
})

// specs/match-details-missions.md AC-MM-12
describe('isEligibleMissionAssignee', () => {
  it('is true for an id present in the passed list', () => {
    expect(isEligibleMissionAssignee('u2', ['u1', 'u2'])).toBe(true)
  })

  it('is false for an id absent from the list and for an empty list', () => {
    expect(isEligibleMissionAssignee('u3', ['u1', 'u2'])).toBe(false)
    expect(isEligibleMissionAssignee('u1', [])).toBe(false)
  })
})
