import { cn } from '../../../shared/lib/utils'

interface TypePillProps {
  label: string
  dotClassName: string // color of the small leading dot
  selectedClassName: string // solid background applied only when selected
  selected: boolean
  onClick: () => void
}

// One pastille of the TYPE selector (UI design §"Structure de l'écran",
// point 2). Deliberately a plain <button>, not the shared <Pill> component:
// Pill is always translucent-on-dark (coach-dashboard header), this one
// needs a distinct "selected = solid color" state Pill doesn't model.
export function TypePill({ label, dotClassName, selectedClassName, selected, onClick }: TypePillProps) {
  return (
    <button
      type="button"
      // aria-pressed communicates the toggle state to assistive tech —
      // this is a single-select group (radio-like), but a plain toggle
      // button group with aria-pressed is the simplest correct pattern
      // here rather than reaching for role="radiogroup".
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-2 text-[13.5px] font-bold text-white/70 transition-colors',
        selected ? cn('border-transparent text-white', selectedClassName) : 'bg-white/6 hover:bg-white/10'
      )}
    >
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', selected ? 'bg-white' : dotClassName)} />
      {label}
    </button>
  )
}