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

interface LogoutButtonProps {
  onLogout: () => void
}

// specs/menu.md UI design §"Bouton « Se déconnecter »" — the confirmation
// AlertDialog block is the same pattern CoachHeader/PlayerHeader's avatar
// and, briefly, ProfilePage used to carry: a 2026-09-04 correction
// consolidated sign-out here as the single place it lives, so none of
// those other screens carry this action anymore
// (see ProfileIdentityHeader.tsx's own note).
//
// Button style is the one exception to that reuse: addendum 2026-09-04
// swaps ProfilePage's filled `variant="destructive"` for the mockup's
// neutral outline pill (`variant="outline"`, `rounded-full`) — a deliberate
// developer call, not a reversion of ProfilePage itself. AC-MN-15's ≥44px
// target still comes from `h-11`.
//
// No new permission, use case, or audit log — `onLogout` is expected to be
// wired straight to the existing SignOutUseCase, same as
// useProfileViewModel.ts's own `onLogout` (§2/§3 of the spec: this action
// is off the RBAC matrix entirely, and never appears in CDC §11.3's list of
// events to journalize).
export function LogoutButton({ onLogout }: LogoutButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-11 w-full rounded-full border-white/15 bg-transparent text-white hover:bg-white/5">
          Se déconnecter
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
          <AlertDialogDescription>Vous devrez vous reconnecter pour accéder à l'application.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onLogout}>Se déconnecter</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
