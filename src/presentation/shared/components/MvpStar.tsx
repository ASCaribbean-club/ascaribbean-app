import { IconStarFilled } from '@tabler/icons-react'
import { cn } from '@presentation/shared/lib/utils'

interface MvpStarProps {
  className?: string
}

// Star shown next to the team's current "joueur du match" (latest closed
// vote). The label is sr-only text: the icon alone means nothing to a screen
// reader.
export function MvpStar({ className }: MvpStarProps) {
  return (
    <>
      <IconStarFilled aria-hidden className={cn('size-4 shrink-0 text-yellow-400', className)} />
      <span className="sr-only">Joueur du match</span>
    </>
  )
}
