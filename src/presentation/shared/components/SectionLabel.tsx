import type { SectionType } from '@domain/entities/section'
import { getSectionTint } from '@presentation/shared/formatters/section-tint'
import { cn } from '@presentation/shared/lib/utils'

interface SectionLabelProps {
  name: string
  type: SectionType | null
  className?: string
}

// Text-only section tag (specs/mobile-dirigeant-habilite.md UI design §0).
export function SectionLabel({ name, type, className }: SectionLabelProps) {
  return <span className={cn('shrink-0 text-[11.5px] font-extrabold', getSectionTint(type), className)}>{name}</span>
}
