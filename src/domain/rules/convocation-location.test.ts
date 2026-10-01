import { describe, expect, it } from 'vitest'
import { getConvocationLocationAddress, getConvocationLocationLabel } from './convocation-location'

const venue = { id: 'loc-1', name: 'Terrain A', address: '1 rue du Stade', isArchived: false }

describe('getConvocationLocationLabel', () => {
  it('returns the referenced venue name for a training with a trainingLocation', () => {
    expect(getConvocationLocationLabel({ location: null, trainingLocation: venue })).toBe('Terrain A')
  })

  it('returns the free-text location for a match or meeting', () => {
    expect(getConvocationLocationLabel({ location: 'Stade adverse', trainingLocation: null })).toBe('Stade adverse')
  })

  it('returns the free-text location for a legacy training', () => {
    expect(getConvocationLocationLabel({ location: 'Ancien lieu', trainingLocation: null })).toBe('Ancien lieu')
  })

  it('prefers the referenced venue when both are present', () => {
    expect(getConvocationLocationLabel({ location: 'Ancien lieu', trainingLocation: venue })).toBe('Terrain A')
  })

  it('still resolves an archived venue', () => {
    expect(getConvocationLocationLabel({ location: null, trainingLocation: { ...venue, isArchived: true } })).toBe('Terrain A')
  })

  it('returns an empty string rather than null if neither form is present', () => {
    expect(getConvocationLocationLabel({ location: null, trainingLocation: null })).toBe('')
  })
})

describe('getConvocationLocationAddress', () => {
  it('returns the venue address for a referenced venue', () => {
    expect(getConvocationLocationAddress({ location: null, trainingLocation: venue })).toBe('1 rue du Stade')
  })

  it('returns null for match, meeting and legacy training', () => {
    expect(getConvocationLocationAddress({ location: 'Stade adverse', trainingLocation: null })).toBeNull()
  })
})
