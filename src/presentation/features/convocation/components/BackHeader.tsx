import { IconChevronLeft } from '@tabler/icons-react'
import { Button } from '../../../shared/components/ui/button'

interface BackHeaderProps {
  title: string
  onBack: () => void
}

// UI design §"Structure de l'écran", point 1: back arrow + a title that's
// identical across all 3 type variants (never dynamic per type) — so this
// takes a plain `title` string rather than a `type` prop, keeping it dumb
// on purpose.
//
// `sticky top-0` (CLAUDE.md §6, "Back navigation stays reachable while
// scrolling"): the form below can grow past the viewport, so without this
// the back arrow scrolls away with the content — the only way back would be
// the OS gesture/button. Matches the submit bar's own `sticky bottom-0` a
// few lines down in the parent screen.
//
// AC-MD-23 requires a ~44px (`h-11`) minimum touch target for the back
// arrow on this screen; bumped from the original `size-9.5` mockup size to
// `size-11` to meet it. This component is shared with convocations/new, so
// the larger target applies there too — a strictly positive change.
export function BackHeader({ title, onBack }: BackHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 bg-coach-bg px-5.5 pt-[max(1.375rem,env(safe-area-inset-top))] pb-2">
      <Button
        onClick={onBack}
        aria-label="Retour"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 rounded-full bg-white/8 text-white hover:bg-white/15"
      >
        <IconChevronLeft className="size-5" />
      </Button>
      <h1 className="text-xl font-extrabold text-white">{title}</h1>
    </header>
  )
}