import { Button } from '@presentation/shared/components/ui/button'

interface ConvocationFormFooterProps {
  submitLabel: string
  submittingLabel: string
  isSubmitting: boolean
  // false = no submit button at all (window closed: nothing to retry).
  showSubmit: boolean
  // Form state (nothing changed yet), not a right.
  submitDisabled: boolean
  cancelLabel: string
  onCancel: () => void
}

// "Annuler" on the left (back to the list, writes nothing), the submit button
// on the remaining width. While sending: its own pending label, disabled.
export function ConvocationFormFooter({
  submitLabel,
  submittingLabel,
  isSubmitting,
  showSubmit,
  submitDisabled,
  cancelLabel,
  onCancel,
}: ConvocationFormFooterProps) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="h-11 rounded-full px-6">
        {cancelLabel}
      </Button>
      {showSubmit && (
        <Button
          type="submit"
          disabled={isSubmitting || submitDisabled}
          className="h-11 flex-1 rounded-full bg-white text-black hover:bg-white/90"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      )}
    </div>
  )
}
