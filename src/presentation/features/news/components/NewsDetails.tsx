import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@presentation/shared/lib/utils'

interface NewsDetailsProps {
  details: string
}

// Shared by the member feed (NewsCard) and the Dirigeant console row so both
// render the description the same way.
export function NewsDetails({ details }: NewsDetailsProps) {
  const [expanded, setExpanded] = useState(false)
  const [isClampable, setIsClampable] = useState(false)
  const detailsRef = useRef<HTMLParagraphElement>(null)

  // Measured while clamped: scrollHeight > clientHeight means more than 3
  // lines. Once expanded the text no longer overflows, so keep the last
  // answer instead of re-measuring (otherwise "Voir moins" would vanish).
  useLayoutEffect(() => {
    const el = detailsRef.current
    if (el && !expanded) setIsClampable(el.scrollHeight > el.clientHeight + 1)
  }, [details, expanded])

  return (
    <>
      {/* whitespace-pre-wrap keeps the line breaks and runs of spaces the author typed. Clamped to
          3 lines until tapped; the toggle only exists when the text really
          overflows, so short news stay a plain paragraph. */}
      <p
        ref={detailsRef}
        className={cn(
          'm-0 text-[13.5px] leading-relaxed whitespace-pre-wrap text-white/60',
          !expanded && 'line-clamp-3',
          isClampable && 'cursor-pointer',
        )}
        onClick={isClampable ? () => setExpanded((v) => !v) : undefined}
      >
        {details}
      </p>
      {isClampable && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="-my-2 flex h-11 w-fit items-center text-[13px] font-bold text-coach-green-link"
        >
          {expanded ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </>
  )
}
