import { createContext, useContext, useState, type PropsWithChildren } from 'react'
import type { SectionFilter } from '@domain/rules/club-schedule-rules'

// specs/mobile-dirigeant-habilite.md §1.2 — the Dirigeant's section filter is
// SHARED between the dashboard and the calendar (AC-DH-15), same level as
// ActiveTeamProvider, and not persisted. Holds only the selected section id
// (null = "Toutes"); each ViewModel loads the sections list itself.
interface SectionFilterState {
  sectionFilter: SectionFilter
  selectSection: (sectionId: SectionFilter) => void
}

const SectionFilterContext = createContext<SectionFilterState | null>(null)

export function SectionFilterProvider({ children }: PropsWithChildren) {
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>(null)

  return (
    <SectionFilterContext.Provider value={{ sectionFilter, selectSection: setSectionFilter }}>
      {children}
    </SectionFilterContext.Provider>
  )
}

export function useSectionFilterContext(): SectionFilterState {
  const context = useContext(SectionFilterContext)
  if (!context) {
    throw new Error('useSectionFilterContext must be used within a SectionFilterProvider')
  }
  return context
}
