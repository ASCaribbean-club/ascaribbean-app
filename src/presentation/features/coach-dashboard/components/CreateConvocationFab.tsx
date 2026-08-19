import { Button } from '../../../shared/components/ui/button'

interface CreateConvocationFabProps {
  visible: boolean
  onClick: () => void
}

// AC-CD-06/AC-CD-07 : absente si la permission "convocation:create" est
// fausse pour l'utilisateur — jamais grisée. La permission elle-même est
// calculée dans useCoachDashboardViewModel via can(), pas ici.
export function CreateConvocationFab({ visible, onClick }: CreateConvocationFabProps) {
  if (!visible) return null

  return (
    <Button
      onClick={onClick}
      aria-label="Créer une convocation"
      size="icon"
      className="fixed right-6 bottom-24 z-15 size-13 rounded-full bg-coach-green text-2xl leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:bg-coach-green/90"
    >
      +
    </Button>
  )
}
