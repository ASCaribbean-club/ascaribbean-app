import { IconPencil } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'

interface EditMatchDetailsButtonProps {
  onClick: () => void
}

// docs/designs/coach-match-details/[v3] [Coach] Mob - Match editing infos.png
// — the "bandeau d'action" above MatchDetailsInfos' bordered card
// (InfosTab.tsx), the developer's own verbatim placement request ("edit icon
// button before info card"). Icon only, no visible label — `aria-label` is
// mandatory (AC-EM-16), same reasoning as AttendanceConfirmRow's ✓/✗
// buttons. Solid green circle (`bg-coach-green`), per the mockup — not the
// neutral `bg-white/8` ghost treatment used elsewhere on this screen (e.g.
// BackHeader): this button is the ONLY entry point into a write action on
// this whole tab, and the mockup marks it visually distinct for that reason.
// shadcn's `size="icon"` defaults to `size-8` (32px) — overridden to
// `size-12` (48px, comfortably above the ~44px floor, AC-EM-15) to match
// the mockup's taller/pill-styled sizing used throughout this edit form.
export function EditMatchDetailsButton({ onClick }: EditMatchDetailsButtonProps) {
  return (
    <Button
      type="button"
      aria-label="Modifier les informations du match"
      onClick={onClick}
      size="icon"
      className="size-12 shrink-0 rounded-full bg-coach-green text-white hover:bg-coach-green/90"
    >
      <IconPencil className="size-5" />
    </Button>
  )
}
