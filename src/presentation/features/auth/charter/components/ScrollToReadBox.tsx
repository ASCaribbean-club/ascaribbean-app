import { useCallback, useEffect, useRef } from 'react'
import type { LegalSection } from '../charter-content'

interface ScrollToReadBoxProps {
  intro: string
  sections: LegalSection[]
  onReachedEnd: () => void
}

// Tolerance for sub-pixel scrollTop values on high-DPI phones.
const END_TOLERANCE_PX = 8

export function ScrollToReadBox({ intro, sections, onReachedEnd }: ScrollToReadBoxProps) {
  const ref = useRef<HTMLDivElement>(null)

  const checkEnd = useCallback(() => {
    const el = ref.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - END_TOLERANCE_PX) onReachedEnd()
  }, [onReachedEnd])

  // Covers content short enough that it never needs scrolling.
  useEffect(() => {
    checkEnd()
  }, [checkEnd])

  return (
    <div
      ref={ref}
      onScroll={checkEnd}
      tabIndex={0}
      className="max-h-64 space-y-3 overflow-y-auto rounded-[14px] bg-auth-bg p-3.5 text-xs leading-relaxed text-[oklch(48%_0.01_90)]"
    >
      <p>{intro}</p>
      {sections.map((section) => (
        <section key={section.heading} className="space-y-1">
          <h3 className="font-bold text-auth-text">{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  )
}
