import type { ConvocationType } from '@domain/entities/convocation'
import { CONVOCATION_TYPE_ACCENT } from '@presentation/shared/formatters/convocation-type-accent'
import { formatConvocationType } from '@presentation/shared/formatters/convocation-labels'
import { TypePill } from '@presentation/features/convocation/components/TypePill'

interface CoachAlertsTypeFilterProps {
  selectedTypes: ConvocationType[]
  onToggleType: (type: ConvocationType) => void
  // Développeuse, 2026-09-30 — same "hide at 0" convention as the page
  // title's "(N)": a type with no alert at all reads as a bare label, never
  // "Match (0)".
  countByType: Record<ConvocationType, number>
}

// Same order/colors as create-convocation's TypeSelector (reuses
// CONVOCATION_TYPE_ACCENT/formatConvocationType rather than a third local
// color map) and the same TypePill primitive — but MULTI-select here, not
// TypeSelector's single-value radio-like group: several chips can be
// pressed at once, and none pressed means "no filter, show every type"
// (useCoachAlertsViewModel's own default), never an empty list at rest.
const TYPE_ORDER: ConvocationType[] = ['match', 'training', 'meeting']

export function CoachAlertsTypeFilter({ selectedTypes, onToggleType, countByType }: CoachAlertsTypeFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par type">
      {TYPE_ORDER.map((type) => {
        const accent = CONVOCATION_TYPE_ACCENT[type]
        const count = countByType[type]
        return (
          <TypePill
            key={type}
            label={count > 0 ? `${formatConvocationType(type)} (${count})` : formatConvocationType(type)}
            dotClassName={accent.rail}
            selectedClassName={accent.rail}
            selected={selectedTypes.includes(type)}
            onClick={() => onToggleType(type)}
          />
        )
      })}
    </div>
  )
}
