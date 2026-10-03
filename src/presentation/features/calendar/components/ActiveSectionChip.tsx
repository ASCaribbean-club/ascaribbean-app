import { IconX } from '@tabler/icons-react'

interface ActiveSectionChipProps {
  sectionName: string
  onClear: () => void
}

// "Section : E-Sport ✕" — makes an active filter visible and removes it in
// one tap (back to "Toutes"). Absent under "Toutes".
export function ActiveSectionChip({ sectionName, onClear }: ActiveSectionChipProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Retirer le filtre section ${sectionName}`}
      className="flex h-11 w-fit items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 text-[14px] font-semibold text-white"
    >
      <span>Section : {sectionName}</span>
      <IconX className="size-4 text-white/60" aria-hidden />
    </button>
  )
}
