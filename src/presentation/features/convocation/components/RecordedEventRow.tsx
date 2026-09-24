import { IconTrash } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'
import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'

interface RecordedEventRowProps {
  name: string
  subtitle?: string
  isDeleting: boolean
  onDelete: () => void
}

// specs/match-stats.md AC-MS-12/MS-11 — the delete affordance MS-11
// requires exists in NONE of the four mockups (UI-MS-C, "à confirmer avant
// de supposer qu'elle manque à la maquette", non-blocking). This is the
// smallest addition consistent with the rest of the screen: one row per
// already-recorded event, above its own picker, with a trash icon Coach/
// Staff can tap — never shown to a player (BUTEURS/CARTONS lists render
// this only inside the coach variant, see ConvocationDetailPage.tsx's
// "resultats" TabsContent). `h-11`
// (size-11) touch target on the delete button (CLAUDE.md §6).
export function RecordedEventRow({ name, subtitle, isDeleting, onDelete }: RecordedEventRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <InitialsAvatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-white">{name}</p>
        {subtitle && <p className="text-[12px] text-white/50">{subtitle}</p>}
      </div>
      <Button
        type="button"
        aria-label={`Supprimer l’événement de ${name}`}
        variant="ghost"
        size="icon"
        disabled={isDeleting}
        onClick={onDelete}
        className="size-11 shrink-0 rounded-full text-coach-red-text hover:bg-coach-red/15 hover:text-coach-red-text disabled:opacity-40"
      >
        <IconTrash className="size-5" />
      </Button>
    </li>
  )
}
