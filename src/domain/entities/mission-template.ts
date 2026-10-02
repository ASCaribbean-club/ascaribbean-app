import type { ConvocationType } from '@domain/entities/convocation'

// specs/web-mission-templates.md §2.2 — a club-wide mission template, per
// convocation type (e.g. "bring the water"). Never deleted: deactivated /
// reactivated. A modification only affects FUTURE convocations (§2.1).
export interface MissionTemplate {
  id: string
  convocationType: ConvocationType
  label: string
  defaultCapacity: number
  // Optional details; null when absent (blank input is stored as null).
  description: string | null
  isActive: boolean
}
