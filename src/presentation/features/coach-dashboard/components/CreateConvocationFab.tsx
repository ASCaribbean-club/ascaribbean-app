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
    <button type="button" className="create-convocation-fab" onClick={onClick} aria-label="Créer une convocation">
      +
    </button>
  )
}
