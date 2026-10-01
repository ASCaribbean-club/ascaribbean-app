import { Button } from '@presentation/shared/components/ui/button'

interface LineupHeaderProps {
  title: string
  // 'edit' = "Modifier la compo", 'done' = "Terminé", null = no control
  // (player view, or a coach without the permission: ABSENT, never greyed).
  action: 'edit' | 'done' | null
  isSaving: boolean
  onEdit: () => void
  onDone: () => void
}

// specs/coach-match-composition.md UI design §4 (mockups C2, C5..C8). The
// title truncates before the button (`min-w-0`); the button keeps `h-11`.
export function LineupHeader({ title, action, isSaving, onEdit, onDone }: LineupHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="min-w-0 flex-1 truncate text-xs font-extrabold tracking-wider text-white/50 uppercase">{title}</h2>
      {action === 'edit' && (
        <Button
          type="button"
          variant="outline"
          onClick={onEdit}
          className="h-11 min-w-0 shrink rounded-full border-white/15 bg-white/5 px-4 font-bold text-white hover:bg-white/10 hover:text-white"
        >
          Modifier la compo
        </Button>
      )}
      {action === 'done' && (
        <Button
          type="button"
          disabled={isSaving}
          onClick={onDone}
          className="h-11 min-w-0 shrink rounded-full bg-coach-green px-5 font-bold text-white hover:bg-coach-green/90"
        >
          {isSaving ? 'Enregistrement…' : 'Terminé'}
        </Button>
      )}
    </div>
  )
}
