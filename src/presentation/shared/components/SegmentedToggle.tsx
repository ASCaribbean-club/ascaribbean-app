import { cn } from '@presentation/shared/lib/utils'

interface SegmentedToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  trueLabel: string
  falseLabel: string
  trueColor?: string
  falseColor?: string
  // Generalized on promotion to shared/ (was hardcoded to "Lieu de la
  // rencontre", the ONLY call site at the time) — now a required prop so a
  // second call site (MatchResultCardPicker's Jaune/Rouge) doesn't inherit
  // a misleading label.
  ariaLabel: string
  // specs/edit-match-details.md — developer feedback (2026-09-24): the
  // options render visually oversized inside MatchDetailsEditForm's
  // narrower bordered card (vs. CreateConvocationForm's full-width screen).
  // `'sm'` trims vertical padding/font size for a tighter look WITHOUT
  // dropping the option below CLAUDE.md §6's ~44px touch-target floor — an
  // explicit `h-11` replaces the padding-driven auto height so the shrink
  // is capped, not open-ended. Defaults to `'default'`, which keeps
  // CreateConvocationForm's own rendering byte-for-byte unchanged.
  size?: 'default' | 'sm'
}

// "Lieu de la rencontre — Domicile/Extérieur" (match only, UI design
// §"Structure de l'écran", point 3). A 2-option exclusive toggle — modeled
// as a boolean prop (not a string union) since the domain field it drives,
// MatchDetails.isHome, is itself a boolean (domain/entities/match-details.ts).
//
// Promoted from features/convocation/components/SegmentedToggle.tsx to
// shared/components/ — specs/match-stats.md's CARTONS card
// (MatchResultCardPicker) needs the identical exclusive 2-option shape
// (Jaune/Rouge), same "a component used by two features moves to
// shared/components/" precedent already applied to InitialsAvatar/
// TeamCrestAvatar in this pass. `coach-amber` added to the color map for
// that call site — content/behavior otherwise unchanged.
export function SegmentedToggle({
  value,
  onChange,
  trueLabel,
  falseLabel,
  trueColor = 'coach-red',
  falseColor = 'coach-red',
  ariaLabel,
  size = 'default',
}: SegmentedToggleProps) {
  return (
    <div className="flex gap-3.5" role="radiogroup" aria-label={ariaLabel}>
      <SegmentedOption label={trueLabel} selected={value} onClick={() => onChange(true)} color={trueColor} size={size} />
      <SegmentedOption label={falseLabel} selected={!value} onClick={() => onChange(false)} color={falseColor} size={size} />
    </div>
  )
}

const colorMap: Record<string, string> = {
  'coach-green': 'bg-coach-green',
  'coach-red': 'bg-coach-red',
  'coach-amber': 'bg-coach-amber',
}

function SegmentedOption({
  label,
  selected,
  onClick,
  color,
  size,
}: {
  label: string
  selected: boolean
  onClick: () => void
  color: string
  size: 'default' | 'sm'
}) {
  const bgColor = colorMap[color] || 'bg-coach-red'
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        // `rounded-lg` matches FIELD_CLASSNAME's Input/Select radius
        // (field-style.ts) — CreateConvocationForm's own fields must read as
        // one consistent set, this toggle sits right among them.
        'flex-1 rounded-lg border text-center font-extrabold transition-colors',
        size === 'sm' ? 'h-11 text-[13px]' : 'py-3 text-[14.5px]',
        selected ? `border-transparent ${bgColor} text-white` : 'border-white/10 bg-white/6 text-white/70'
      )}
    >
      {label}
    </button>
  )
}
