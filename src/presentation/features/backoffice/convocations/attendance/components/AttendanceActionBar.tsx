import { Button } from '@presentation/shared/components/ui/button'

interface AttendanceActionBarProps {
  changedCount: number
  isSaving: boolean
  onLater: () => void
  onSave: () => void
}

// Anchored bar, opaque background (long roster): "Plus tard" writes nothing,
// "Enregistrer" is disabled until a line changed, the counter says why.
export function AttendanceActionBar({ changedCount, isSaving, onLater, onSave }: AttendanceActionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 flex max-w-2xl items-center gap-3 bg-background py-3">
      <Button type="button" variant="outline" onClick={onLater} disabled={isSaving} className="h-11 rounded-full px-6">
        Plus tard
      </Button>
      <Button
        type="button"
        onClick={onSave}
        disabled={isSaving || changedCount === 0}
        className="h-11 flex-1 rounded-full bg-white text-black hover:bg-white/90"
      >
        {isSaving ? 'Enregistrement…' : 'Enregistrer les présences'}
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {changedCount} modification{changedCount > 1 ? 's' : ''}
      </span>
    </div>
  )
}
