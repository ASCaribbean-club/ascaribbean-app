import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@presentation/shared/components/ui/alert-dialog'
import { Button } from '@presentation/shared/components/ui/button'
import { useBackofficeLogoutButton } from './useBackofficeLogoutButton'

// specs/web-dashboard.md §2.6/PO-WD-08a — the mobile LogoutButton's PATTERN
// reused (an AlertDialog confirmation before calling SignOutUseCase — the
// default position, "confirmation, par cohérence avec le mobile"), not its
// RENDER: that component is styled for the mobile dark pill palette
// (border-white/15), this one takes the backoffice's own `dark` palette
// treatment already used throughout BackofficeSidebar (`variant="outline"`,
// full column width, `h-11`). A new, LOCAL component rather than an import
// of features/menu/components/LogoutButton.tsx, deliberately (§2.6).
export function BackofficeLogoutButton() {
  const { onLogout } = useBackofficeLogoutButton()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-11 w-full justify-start rounded-lg">
          Déconnexion
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
          <AlertDialogDescription>Vous devrez vous reconnecter pour accéder au backoffice.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onLogout}>Se déconnecter</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
