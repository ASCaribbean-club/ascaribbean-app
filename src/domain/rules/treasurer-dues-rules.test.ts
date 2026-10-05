import { describe, expect, it } from 'vitest'
import type { TreasurerDue } from '../entities/treasurer-due'
import {
  countByStatus,
  effectiveSectionFilter,
  filterByStatus,
  filterEntriesBySection,
  progressPercent,
  representedSections,
  searchByName,
  selectOutstanding,
  shouldShowSectionFilter,
  sortForList,
  summarizeBySection,
  summarizeCollection,
  summarizeOutstanding,
  toDueEntry,
  type TreasurerDueEntry,
} from './treasurer-dues-rules'

const seniors = { id: 'section-seniors', name: 'Seniors' }
const youth = { id: 'section-youth', name: 'Jeunes' }

function due(overrides: Partial<TreasurerDue> = {}): TreasurerDue {
  return { membershipId: 'm-1', memberName: 'Joueur A', amountDueCents: 10000, sections: [], payments: [], ...overrides }
}

function entry(overrides: Partial<TreasurerDue> = {}, tariff: number | null = null): TreasurerDueEntry {
  return toDueEntry(due(overrides), tariff)
}

describe('toDueEntry', () => {
  it('is unpaid with the full amount remaining when nothing was paid', () => {
    expect(entry()).toMatchObject({ paidCents: 0, remainingCents: 10000, status: 'unpaid' })
  })

  it('is partial when some but not all was paid', () => {
    const result = entry({ payments: [{ id: 'p1', amountCents: 4000, paidAt: '2026-09-01', paymentMethod: null }] })
    expect(result).toMatchObject({ paidCents: 4000, remainingCents: 6000, status: 'partial' })
  })

  it('is paid at exactly the amount due, with nothing remaining', () => {
    const result = entry({
      payments: [
        { id: 'p1', amountCents: 4000, paidAt: '2026-09-01', paymentMethod: null },
        { id: 'p2', amountCents: 6000, paidAt: '2026-09-10', paymentMethod: null },
      ],
    })
    expect(result).toMatchObject({ paidCents: 10000, remainingCents: 0, status: 'paid' })
  })

  it('never reports a negative remaining amount on over-perception', () => {
    expect(entry({ payments: [{ id: 'p1', amountCents: 12000, paidAt: '2026-09-01', paymentMethod: null }] })).toMatchObject({
      remainingCents: 0,
      status: 'paid',
    })
  })

  it('falls back to the season tariff (euros converted to cents) when the membership has no amount', () => {
    expect(entry({ amountDueCents: null }, 45.5)).toMatchObject({ amountDueCents: 4550, status: 'unpaid' })
  })

  it('keeps its own amount over the season tariff', () => {
    expect(entry({ amountDueCents: 10000 }, 45)).toMatchObject({ amountDueCents: 10000 })
  })

  it('is undefined with no remaining when neither an amount nor a tariff exists', () => {
    expect(entry({ amountDueCents: null }, null)).toMatchObject({ amountDueCents: null, remainingCents: 0, status: 'undefined' })
  })

  it('sorts payments most recent first', () => {
    const result = entry({
      payments: [
        { id: 'old', amountCents: 1000, paidAt: '2026-08-01', paymentMethod: null },
        { id: 'new', amountCents: 1000, paidAt: '2026-09-20', paymentMethod: null },
      ],
    })
    expect(result.payments.map((payment) => payment.id)).toEqual(['new', 'old'])
  })
})

describe('section filter predicate', () => {
  it('is hidden with no entries', () => {
    expect(shouldShowSectionFilter([])).toBe(false)
  })

  it('is hidden when no entry has a section', () => {
    expect(shouldShowSectionFilter([entry(), entry({ membershipId: 'm-2' })])).toBe(false)
  })

  it('is hidden with exactly one distinct section, however many entries share it', () => {
    const entries = [entry({ sections: [seniors] }), entry({ membershipId: 'm-2', sections: [seniors] })]
    expect(shouldShowSectionFilter(entries)).toBe(false)
  })

  it('is hidden with one section plus entries that have none', () => {
    expect(shouldShowSectionFilter([entry({ sections: [seniors] }), entry({ membershipId: 'm-2' })])).toBe(false)
  })

  it('is shown with two distinct sections', () => {
    expect(shouldShowSectionFilter([entry({ sections: [seniors] }), entry({ membershipId: 'm-2', sections: [youth] })])).toBe(true)
  })

  it('is shown when one member alone spans two sections', () => {
    expect(shouldShowSectionFilter([entry({ sections: [seniors, youth] })])).toBe(true)
  })
})

describe('representedSections', () => {
  it('lists distinct sections sorted by name, ignoring entries without one', () => {
    const entries = [entry({ sections: [seniors] }), entry({ membershipId: 'm-2', sections: [youth, seniors] }), entry({ membershipId: 'm-3' })]
    expect(representedSections(entries)).toEqual([youth, seniors])
  })
})

describe('effectiveSectionFilter', () => {
  const both = [entry({ sections: [seniors] }), entry({ membershipId: 'm-2', sections: [youth] })]

  it('keeps a represented selection while the filter is shown', () => {
    expect(effectiveSectionFilter(seniors.id, both)).toBe(seniors.id)
  })

  it('falls back to null when the filter is hidden', () => {
    expect(effectiveSectionFilter(seniors.id, [entry({ sections: [seniors] })])).toBeNull()
  })

  it('falls back to null for a section that is not represented', () => {
    expect(effectiveSectionFilter('unknown', both)).toBeNull()
  })

  it('stays null on "Toutes"', () => {
    expect(effectiveSectionFilter(null, both)).toBeNull()
  })
})

describe('filterEntriesBySection', () => {
  const a = entry({ membershipId: 'a', sections: [seniors] })
  const b = entry({ membershipId: 'b', sections: [youth] })
  const both = entry({ membershipId: 'both', sections: [seniors, youth] })
  const none = entry({ membershipId: 'none' })

  it('returns everything, including members without section, on "Toutes"', () => {
    expect(filterEntriesBySection([a, b, both, none], null)).toHaveLength(4)
  })

  it('keeps a member of two sections under each of them and drops those without section', () => {
    expect(filterEntriesBySection([a, b, both, none], seniors.id).map((e) => e.membershipId)).toEqual(['a', 'both'])
    expect(filterEntriesBySection([a, b, both, none], youth.id).map((e) => e.membershipId)).toEqual(['b', 'both'])
  })
})

describe('summarizeCollection', () => {
  it('sums collected and due, and counts the three statuses', () => {
    const entries = [
      entry({ membershipId: 'a', payments: [{ id: 'p', amountCents: 10000, paidAt: '2026-09-01', paymentMethod: null }] }),
      entry({ membershipId: 'b', payments: [{ id: 'p', amountCents: 2500, paidAt: '2026-09-01', paymentMethod: null }] }),
      entry({ membershipId: 'c' }),
    ]
    expect(summarizeCollection(entries)).toEqual({
      collectedCents: 12500,
      dueCents: 30000,
      remainingCents: 17500,
      percent: 42,
      paidCount: 1,
      partialCount: 1,
      unpaidCount: 1,
    })
  })

  it('leaves undefined-amount entries out of the counters and totals', () => {
    const summary = summarizeCollection([entry({ membershipId: 'a' }), entry({ membershipId: 'u', amountDueCents: null })])
    expect(summary).toMatchObject({ dueCents: 10000, unpaidCount: 1, paidCount: 0, partialCount: 0 })
  })

  it('is all zeros on an empty list without dividing by zero', () => {
    expect(summarizeCollection([])).toMatchObject({ collectedCents: 0, dueCents: 0, remainingCents: 0, percent: 0 })
  })
})

describe('progressPercent', () => {
  it('clamps to 100 on over-perception and returns 0 without a due amount', () => {
    expect(progressPercent(15000, 10000)).toBe(100)
    expect(progressPercent(500, 0)).toBe(0)
  })
})

describe('summarizeBySection', () => {
  it('gives one row per section then a trailing "Sans section" row', () => {
    const entries = [
      entry({ membershipId: 'a', sections: [seniors], payments: [{ id: 'p', amountCents: 10000, paidAt: '2026-09-01', paymentMethod: null }] }),
      entry({ membershipId: 'b', sections: [youth] }),
      entry({ membershipId: 'c' }),
    ]
    const rows = summarizeBySection(entries)
    expect(rows.map((row) => row.name)).toEqual(['Jeunes', 'Seniors', 'Sans section'])
    expect(rows[1]).toMatchObject({ sectionId: seniors.id, collectedCents: 10000, dueCents: 10000, percent: 100 })
    expect(rows[2]).toMatchObject({ sectionId: null, dueCents: 10000 })
  })

  it('counts a member of two sections in each, so rows may exceed the total', () => {
    const rows = summarizeBySection([entry({ sections: [seniors, youth] })])
    expect(rows.map((row) => row.dueCents)).toEqual([10000, 10000])
  })

  it('has no "Sans section" row when every entry has a section', () => {
    expect(summarizeBySection([entry({ sections: [seniors] })]).map((row) => row.name)).toEqual(['Seniors'])
  })
})

describe('outstanding and list helpers', () => {
  const big = entry({ membershipId: 'big', memberName: 'Zoe', amountDueCents: 20000 })
  const smallB = entry({ membershipId: 'sb', memberName: 'Bruno', amountDueCents: 5000 })
  const smallA = entry({ membershipId: 'sa', memberName: 'Alice', amountDueCents: 5000 })
  const settled = entry({ membershipId: 's', memberName: 'Carl', payments: [{ id: 'p', amountCents: 10000, paidAt: '2026-09-01', paymentMethod: null }] })

  it('selects only remaining > 0, biggest first then by name', () => {
    expect(selectOutstanding([settled, smallB, big, smallA]).map((e) => e.membershipId)).toEqual(['big', 'sa', 'sb'])
  })

  it('summarizes the outstanding count and amount', () => {
    expect(summarizeOutstanding([settled, smallB, big])).toEqual({ count: 2, remainingCents: 25000 })
  })

  it('sorts the list by remaining descending then name, keeping settled last', () => {
    expect(sortForList([settled, smallB, big, smallA]).map((e) => e.membershipId)).toEqual(['big', 'sa', 'sb', 's'])
  })

  it('counts and filters by status', () => {
    const all = [big, settled, smallA]
    expect(countByStatus(all)).toEqual({ all: 3, unpaid: 2, partial: 0, paid: 1 })
    expect(filterByStatus(all, 'paid')).toEqual([settled])
    expect(filterByStatus(all, 'all')).toBe(all)
  })
})

describe('searchByName', () => {
  const entries = [entry({ memberName: 'Élodie Martin' }), entry({ membershipId: 'm-2', memberName: 'Hugo Durand' })]

  it('ignores case and accents', () => {
    expect(searchByName(entries, 'ELODIE')).toHaveLength(1)
    expect(searchByName(entries, 'durand')).toHaveLength(1)
  })

  it('returns everything for a blank query', () => {
    expect(searchByName(entries, '   ')).toHaveLength(2)
  })

  it('returns nothing when no name matches', () => {
    expect(searchByName(entries, 'zzz')).toEqual([])
  })
})
