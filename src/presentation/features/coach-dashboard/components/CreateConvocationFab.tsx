import { FloatingActionButton } from '@presentation/shared/components/FloatingActionButton'

interface CreateConvocationFabProps {
  visible: boolean
  onClick: () => void
}

// AC-CD-06/AC-CD-07 : absente si la permission "convocation:create" est
// fausse pour l'utilisateur — jamais grisée. La permission elle-même est
// calculée dans useCoachDashboardViewModel via can(), pas ici. Le rendu
// vient du FAB partagé (même gabarit pour l'onglet Actus du Dirigeant).
export function CreateConvocationFab({ visible, onClick }: CreateConvocationFabProps) {
  return <FloatingActionButton visible={visible} label="Créer une convocation" onClick={onClick} />
}
