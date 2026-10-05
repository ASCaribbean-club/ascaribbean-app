// Pure rules for the Treasurer's mobile views — "what's true", never "who's
// allowed" (specs/mobile-treasurer.md). The section filter is NOT a security
// boundary: it sorts data the database function already authorized, so it has
// no entry in the RBAC matrix. Payment status is NEVER recomputed here:
// membershipPaymentStatus()/sumPaymentsCents() stay the single
// implementation (AC-TR-06).
import type { TreasurerDue, TreasurerDuePayment, TreasurerDueSection } from '../entities/treasurer-due'
import { membershipPaymentStatus, sumPaymentsCents, type MembershipPaymentStatus } from './membership-payment-rules'

// null = "Toutes". A concrete value is a public.sections id.
export type TreasurerSectionFilter = string | null

export type DuesStatusFilter = 'all' | 'unpaid' | 'partial' | 'paid'

export interface TreasurerDueEntry {
  membershipId: string
  memberName: string
  sections: TreasurerDueSection[]
  // Effective amount (PO-TR-03): the membership's own, else the season tariff.
  amountDueCents: number | null
  paidCents: number
  // max(0, due - paid); 0 when the amount due is unknown.
  remainingCents: number
  status: MembershipPaymentStatus
  // Most recent first.
  payments: TreasurerDuePayment[]
}

// PO-TR-03 default: same effective amount as /admin/memberships. The season
// tariff is in euros (Season.cotisationAmount), converted to integer cents.
export function toDueEntry(due: TreasurerDue, seasonCotisationAmount: number | null): TreasurerDueEntry {
  const amountDueCents =
    due.amountDueCents ?? (seasonCotisationAmount !== null ? Math.round(seasonCotisationAmount * 100) : null)
  const paidCents = sumPaymentsCents(due.payments)
  const status = membershipPaymentStatus(paidCents, amountDueCents)
  return {
    membershipId: due.membershipId,
    memberName: due.memberName,
    sections: due.sections,
    amountDueCents,
    paidCents,
    remainingCents: amountDueCents === null ? 0 : Math.max(0, amountDueCents - paidCents),
    status,
    payments: [...due.payments].sort(byPaidAtDescending),
  }
}

function byPaidAtDescending(a: TreasurerDuePayment, b: TreasurerDuePayment): number {
  if (a.paidAt === b.paidAt) return 0
  return a.paidAt < b.paidAt ? 1 : -1
}

// --- Section filter (specs/mobile-treasurer.md §1 "Règle centrale") ---

// Distinct sections attached to the given entries — NOT the rows of
// public.sections. An entry with no section contributes nothing.
export function representedSections(entries: TreasurerDueEntry[]): TreasurerDueSection[] {
  const byId = new Map<string, TreasurerDueSection>()
  for (const entry of entries) {
    for (const section of entry.sections) byId.set(section.id, section)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

// AC-TR-10/11/12 — the ONE predicate both screens read. 0 or 1 section
// represented: no section control at all; 2 or more: chips and filter group.
export function shouldShowSectionFilter(entries: TreasurerDueEntry[]): boolean {
  return representedSections(entries).length >= 2
}

// A selection that is hidden (filter not shown) or not represented (e.g. left
// over from another role's view of the shared filter) falls back to "Toutes".
export function effectiveSectionFilter(selected: TreasurerSectionFilter, entries: TreasurerDueEntry[]): TreasurerSectionFilter {
  if (selected === null || !shouldShowSectionFilter(entries)) return null
  return representedSections(entries).some((section) => section.id === selected) ? selected : null
}

// PO-TR-02: a member in two sections is counted in each. Members with no
// section only appear under "Toutes" (null).
export function filterEntriesBySection(entries: TreasurerDueEntry[], sectionFilter: TreasurerSectionFilter): TreasurerDueEntry[] {
  if (sectionFilter === null) return entries
  return entries.filter((entry) => entry.sections.some((section) => section.id === sectionFilter))
}

// --- Collection summary ---

export interface CollectionSummary {
  collectedCents: number
  dueCents: number
  remainingCents: number
  // Whole percent, clamped to 0..100 (over-perception never shows > 100%).
  percent: number
  paidCount: number
  partialCount: number
  unpaidCount: number
}

export function progressPercent(paidCents: number, dueCents: number): number {
  if (dueCents <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((paidCents / dueCents) * 100)))
}

// PO-TR-03: entries whose amount due is still undefined are outside the
// three counters and outside the totals (AC-TR-07).
export function summarizeCollection(entries: TreasurerDueEntry[]): CollectionSummary {
  const counted = entries.filter((entry) => entry.status !== 'undefined')
  const collectedCents = counted.reduce((total, entry) => total + entry.paidCents, 0)
  const dueCents = counted.reduce((total, entry) => total + (entry.amountDueCents ?? 0), 0)
  return {
    collectedCents,
    dueCents,
    remainingCents: Math.max(0, dueCents - collectedCents),
    percent: progressPercent(collectedCents, dueCents),
    paidCount: counted.filter((entry) => entry.status === 'paid').length,
    partialCount: counted.filter((entry) => entry.status === 'partial').length,
    unpaidCount: counted.filter((entry) => entry.status === 'unpaid').length,
  }
}

export interface SectionCollectionRow {
  // null = the trailing "Sans section" row (PO-TR-02).
  sectionId: string | null
  name: string
  collectedCents: number
  dueCents: number
  percent: number
}

// "Par section": one row per represented section, then "Sans section" last if
// some entries have none. A member in two sections counts in both, so the
// rows may sum to more than the total (PO-TR-02).
export function summarizeBySection(entries: TreasurerDueEntry[]): SectionCollectionRow[] {
  const toRow = (sectionId: string | null, name: string, group: TreasurerDueEntry[]): SectionCollectionRow => {
    const summary = summarizeCollection(group)
    return { sectionId, name, collectedCents: summary.collectedCents, dueCents: summary.dueCents, percent: summary.percent }
  }
  const rows = representedSections(entries).map((section) =>
    toRow(section.id, section.name, filterEntriesBySection(entries, section.id)),
  )
  const withoutSection = entries.filter((entry) => entry.sections.length === 0)
  if (withoutSection.length > 0) rows.push(toRow(null, 'Sans section', withoutSection))
  return rows
}

// --- Lists ---

function byRemainingDescendingThenName(a: TreasurerDueEntry, b: TreasurerDueEntry): number {
  if (a.remainingCents !== b.remainingCents) return b.remainingCents - a.remainingCents
  return a.memberName.localeCompare(b.memberName, 'fr')
}

export function sortForList(entries: TreasurerDueEntry[]): TreasurerDueEntry[] {
  return [...entries].sort(byRemainingDescendingThenName)
}

// "Restes dus": only a remaining amount > 0, biggest first.
export function selectOutstanding(entries: TreasurerDueEntry[]): TreasurerDueEntry[] {
  return entries.filter((entry) => entry.remainingCents > 0).sort(byRemainingDescendingThenName)
}

export function summarizeOutstanding(entries: TreasurerDueEntry[]): { count: number; remainingCents: number } {
  const outstanding = selectOutstanding(entries)
  return { count: outstanding.length, remainingCents: outstanding.reduce((total, entry) => total + entry.remainingCents, 0) }
}

export function filterByStatus(entries: TreasurerDueEntry[], status: DuesStatusFilter): TreasurerDueEntry[] {
  if (status === 'all') return entries
  return entries.filter((entry) => entry.status === status)
}

export function countByStatus(entries: TreasurerDueEntry[]): Record<DuesStatusFilter, number> {
  return {
    all: entries.length,
    unpaid: entries.filter((entry) => entry.status === 'unpaid').length,
    partial: entries.filter((entry) => entry.status === 'partial').length,
    paid: entries.filter((entry) => entry.status === 'paid').length,
  }
}

// Case- and accent-insensitive.
function normalizeForSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export function searchByName(entries: TreasurerDueEntry[], query: string): TreasurerDueEntry[] {
  const needle = normalizeForSearch(query)
  if (needle === '') return entries
  return entries.filter((entry) => normalizeForSearch(entry.memberName).includes(needle))
}
