import { describe, expect, it } from 'vitest'
import { hasMissingElement, type MissingElementFacts } from './user-completeness'

function completeFacts(overrides: Partial<MissingElementFacts> = {}): MissingElementFacts {
  return {
    hasRole: true,
    hasMembershipForCurrentSeason: true,
    hasLicenceNumberForCurrentSeason: true,
    charterAccepted: true,
    ...overrides,
  }
}

describe('hasMissingElement', () => {
  it('is false when all four facts are satisfied', () => {
    expect(hasMissingElement(completeFacts())).toBe(false)
  })

  // AC-WU-37 criterion 1 — no role assigned at all.
  it('is true when the account has no role', () => {
    expect(hasMissingElement(completeFacts({ hasRole: false }))).toBe(true)
  })

  // AC-WU-37 criterion 2 — no membership for the current season.
  it('is true when the account has no membership for the current season', () => {
    expect(hasMissingElement(completeFacts({ hasMembershipForCurrentSeason: false }))).toBe(true)
  })

  // AC-WU-37 criterion 3 — a current-season membership exists but carries no
  // licence number.
  it('is true when the current-season membership has no licence number', () => {
    expect(hasMissingElement(completeFacts({ hasLicenceNumberForCurrentSeason: false }))).toBe(true)
  })

  // AC-WU-37 criterion 4 — charter not accepted, kept deliberately despite
  // the STATUT column redundancy (§2.3).
  it('is true when the charter has not been accepted', () => {
    expect(hasMissingElement(completeFacts({ charterAccepted: false }))).toBe(true)
  })

  // §2.3 — OR, never AND: several failing criteria at once still just
  // yields true, not a different outcome.
  it('is true when every criterion fails at once (a freshly invited account)', () => {
    expect(
      hasMissingElement({
        hasRole: false,
        hasMembershipForCurrentSeason: false,
        hasLicenceNumberForCurrentSeason: false,
        charterAccepted: false,
      }),
    ).toBe(true)
  })

  // §2.3 "repli" — no current season means criteria 2/3 are FALSE facts fed
  // in by the caller, never an error surfacing here; the predicate itself
  // doesn't know why a fact is false, it just combines whatever it's given.
  it('is true via criteria 2/3 alone when there is no current season, even with a role and an accepted charter', () => {
    expect(
      hasMissingElement({
        hasRole: true,
        hasMembershipForCurrentSeason: false,
        hasLicenceNumberForCurrentSeason: false,
        charterAccepted: true,
      }),
    ).toBe(true)
  })
})
