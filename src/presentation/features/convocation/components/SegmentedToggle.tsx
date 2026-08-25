import { cn } from '../../../shared/lib/utils'

interface SegmentedToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  trueLabel: string
  falseLabel: string
  trueColor?: string
  falseColor?: string
}

// "Lieu de la rencontre — Domicile/Extérieur" (match only, UI design
// §"Structure de l'écran", point 3). A 2-option exclusive toggle — modeled
// as a boolean prop (not a string union) since the domain field it drives,
// MatchDetails.isHome, is itself a boolean (domain/entities/match-details.ts).
export function SegmentedToggle({ value, onChange, trueLabel, falseLabel, trueColor = 'coach-red', falseColor = 'coach-red' }: SegmentedToggleProps) {
  return (
    <div className="flex gap-2.5" role="radiogroup" aria-label="Lieu de la rencontre">
      <SegmentedOption label={trueLabel} selected={value} onClick={() => onChange(true)} color={trueColor} />
      <SegmentedOption label={falseLabel} selected={!value} onClick={() => onChange(false)} color={falseColor} />
    </div>
  )
}

const colorMap: Record<string, string> = {
  'coach-green': 'bg-coach-green',
  'coach-red': 'bg-coach-red',
}

function SegmentedOption({ label, selected, onClick, color }: { label: string; selected: boolean; onClick: () => void; color: string }) {
  const bgColor = colorMap[color] || 'bg-coach-red'
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex-1 rounded-xl border py-3 text-center text-[14.5px] font-extrabold transition-colors',
        selected ? `border-transparent ${bgColor} text-white` : 'border-white/10 bg-white/6 text-white/70'
      )}
    >
      {label}
    </button>
  )
}