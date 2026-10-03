import type { Section } from '@domain/entities/section'
import type { ClubScheduleItem } from '@domain/usecases/club-overview/ListClubScheduleUseCase'
import { getConvocationLocationLabel } from '@domain/rules/convocation-location'
import { formatConvocationType } from '@presentation/shared/formatters/convocation-labels'
import { toSectionLabelView, type SectionLabelView } from '@presentation/shared/formatters/section-label'
import type { ConvocationType } from '@domain/entities/convocation'

// What the Dirigeant dashboard renders for one échéance — already composed
// by the ViewModel so the components stay dumb (ARCHITECTURE.md §6).
export interface DirigeantEventView {
  id: string
  type: ConvocationType
  // "Entraînement — Seniors" (Q-UI-07: type + team name).
  title: string
  dateIso: string
  location: string
  meetingPointTime: string | null
  section: SectionLabelView
}

export function toDirigeantEventView(item: ClubScheduleItem, sectionsById: Map<string, Section>): DirigeantEventView {
  const { convocation, team, matchDetails } = item
  return {
    id: convocation.id,
    type: convocation.type,
    title: `${formatConvocationType(convocation.type)} — ${team.name}`,
    dateIso: convocation.date,
    location: getConvocationLocationLabel(convocation),
    meetingPointTime: convocation.type === 'match' ? (matchDetails?.meetingPointTime ?? null) : null,
    section: toSectionLabelView(team, sectionsById),
  }
}
