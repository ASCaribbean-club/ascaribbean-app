import { IconChevronLeft } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'

interface BackHeaderProps {
  title: string
  onBack: () => void
}

// Moved here from features/convocation/components/BackHeader.tsx
// (specs/profile-page.md, router course-correction 2026-09-04: the profile
// screen is a pushed route reached from the dashboard avatar, so it needs
// this same back-arrow chrome) — ARCHITECTURE.md §13.5: "un composant
// utilisé par deux features remonte dans shared/components/ — jamais
// importé d'une feature à l'autre". Now used by convocation/CreateConvocationForm,
// convocation/ConvocationDetailPage, AND profile/ProfilePage, so it can no
// longer live inside the convocation feature folder. Content/behavior
// unchanged from the original — see git history for the per-screen
// reasoning (AC-MD-23 touch target, "shared with convocations/new" note).
//
// UI design §"Structure de l'écran", point 1 (originally
// specs/match_details_page.md): back arrow + a title string, kept dumb on
// purpose rather than taking a `type` prop to derive the title itself.
//
// `sticky top-0` (CLAUDE.md §6, "Back navigation stays reachable while
// scrolling"): whatever screen renders this can grow past the viewport, so
// without this the back arrow would scroll away with the content — the
// only way back would then be the OS gesture/button.
//
// `h-11`/`size-11` (~44px minimum touch target, CLAUDE.md §6) — bumped from
// the original `size-9.5` mockup size (AC-MD-23).
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
