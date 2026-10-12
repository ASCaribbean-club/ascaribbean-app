import type { NewsTagFilter as NewsTagFilterValue } from '@domain/policies/news-visibility'
import { NEWS_TAG_LABELS } from '@presentation/shared/formatters/news-tag'
import { cn } from '@presentation/shared/lib/utils'

const CHIPS: { value: NewsTagFilterValue; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'club', label: NEWS_TAG_LABELS.club },
  { value: 'equipes', label: NEWS_TAG_LABELS.equipes },
  { value: 'boutique', label: NEWS_TAG_LABELS.boutique },
]

interface NewsTagFilterProps {
  value: NewsTagFilterValue
  onChange: (value: NewsTagFilterValue) => void
}

export function NewsTagFilter({ value, onChange }: NewsTagFilterProps) {
  return (
    <div role="group" aria-label="Filtrer par tag" className="flex gap-1.5">
      {CHIPS.map((chip) => (
        <button
          key={chip.value}
          type="button"
          aria-pressed={value === chip.value}
          onClick={() => onChange(chip.value)}
          className={cn(
            'h-11 min-w-0 flex-1 rounded-full border px-2.5 text-[13px] font-semibold',
            value === chip.value ? 'border-white bg-white text-black' : 'border-white/12 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white',
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
