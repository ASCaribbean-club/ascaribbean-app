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
import { IconLogout } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'
import { SidebarTooltip } from './SidebarTooltip'
import { useBackofficeLogoutButton } from './useBackofficeLogoutButton'

// specs/web-dashboard.md §2.6/PO-WD-08a — the mobile LogoutButton's PATTERN
// reused (an AlertDialog confirmation before calling SignOutUseCase — the
// default position, "confirmation, par cohérence avec le mobile"), not its
// RENDER: that component is styled for the mobile dark pill palette
// (border-white/15), this one takes the backoffice's own `dark` palette
// treatment already used throughout BackofficeSidebar (`variant="outline"`,
// full column width, `h-11`). A new, LOCAL component rather than an import
// of features/menu/components/LogoutButton.tsx, deliberately (§2.6).
interface BackofficeLogoutButtonProps {
  isCollapsed?: boolean
}

export function BackofficeLogoutButton({ isCollapsed = false }: BackofficeLogoutButtonProps) {
  const { onLogout } = useBackofficeLogoutButton()

  return (
    <AlertDialog>
      <SidebarTooltip enabled={isCollapsed} label="Déconnexion">
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            aria-label="Déconnexion"
            className={isCollapsed ? 'size-11 self-center rounded-lg p-0' : 'h-11 w-full justify-start rounded-lg'}
          >
            {isCollapsed ? <IconLogout className="size-4.5" aria-hidden /> : 'Déconnexion'}
          </Button>
        </AlertDialogTrigger>
      </SidebarTooltip>
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
