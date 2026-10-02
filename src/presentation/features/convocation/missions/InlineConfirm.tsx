import { Button } from '@presentation/shared/components/ui/button'

interface InlineConfirmProps {
  message: string
  isSubmitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Inline (not modal) confirmation inside a mission card — the pattern of the
// Coach 3/4 exports. Two equal columns, each `min-w-0`, `h-11`.
export function InlineConfirm({ message, isSubmitting, onConfirm, onCancel }: InlineConfirmProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[13px] text-white/80">{message}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting} className="h-11 min-w-0">
          Annuler
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="h-11 min-w-0 bg-red-600 text-white hover:bg-red-600/80"
        >
          {isSubmitting ? 'En cours…' : 'Confirmer'}
        </Button>
      </div>
    </div>
  )
}
