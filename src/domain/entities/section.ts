export type SectionType = 'football' | 'esport' | 'echecs' | 'domino'

export interface Section {
  id: string
  name: string
  type: SectionType
  createdAt: string
}
