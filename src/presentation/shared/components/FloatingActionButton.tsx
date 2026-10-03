import { Button } from './ui/button'

interface FloatingActionButtonProps {
  visible: boolean
  label: string
  onClick: () => void
}

// Extracted from coach-dashboard's CreateConvocationFab so the Dirigeant's
// Actus tab can render the same "+" with its own accessible label
// (specs/mobile-dirigeant-habilite.md §3 point 6). Absent (not greyed) when
// `visible` is false — the permission itself is computed by the ViewModel.
export function FloatingActionButton({ visible, label, onClick }: FloatingActionButtonProps) {
  if (!visible) return null

  return (
    <Button
      onClick={onClick}
      aria-label={label}
      size="icon"
      className="fixed right-6 bottom-24 z-15 size-13 rounded-full bg-coach-green text-2xl leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:bg-coach-green/90"
    >
      +
    </Button>
  )
}
