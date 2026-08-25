import type { ConvocationType } from '@domain/entities/convocation'
import { TypePill } from './TypePill'

interface TypeSelectorProps {
  value: ConvocationType
  onChange: (type: ConvocationType) => void
}

// UI design §"Structure de l'écran", point 2 — 3 pastilles, not 4: the
// mockups' 4th "Autre" pill is dropped entirely per specs/create-convocation.md
// §2/§8 (no 4th ConvocationType exists — see domain/entities/convocation.ts).
// Order and colors match the mockups exactly (Match/red, Entraînement/green,
// Réunion/amber) and the coach-* palette already used by UpcomingList's
// TYPE_ACCENT map, so both screens read consistently.
const TYPE_META: Record<ConvocationType, { label: string; dot: string; selectedBg: string }> = {
  match: { label: 'Match', dot: 'bg-coach-red', selectedBg: 'bg-coach-red' },
  training: { label: 'Entraînement', dot: 'bg-coach-green', selectedBg: 'bg-coach-green' },
  meeting: { label: 'Réunion', dot: 'bg-coach-amber', selectedBg: 'bg-coach-amber' },
}

const TYPE_ORDER: ConvocationType[] = ['match', 'training', 'meeting']

export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <section>
      <h2 className="mb-2.5 text-[11.5px] font-extrabold tracking-wider text-white/50 uppercase">TYPE</h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Type de convocation">
        {TYPE_ORDER.map((type) => {
          const meta = TYPE_META[type]
          return (
            <TypePill
              key={type}
              label={meta.label}
              dotClassName={meta.dot}
              selectedClassName={meta.selectedBg}
              selected={value === type}
              onClick={() => onChange(type)}
            />
          )
        })}
      </div>
    </section>
  )
}