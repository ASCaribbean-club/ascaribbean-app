import { useState } from 'react'
import { IconDots, IconTrash } from '@tabler/icons-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@presentation/shared/components/ui/alert-dialog'
import { Button } from '@presentation/shared/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@presentation/shared/components/ui/dropdown-menu'

interface ConvocationActionsMenuProps {
  onDelete: () => void
  isDeleting: boolean
  errorMessage: string | null
}

// Burger menu in the detail header (coach, upcoming match only — the page
// decides whether to render it). Deleting asks for confirmation first: it
// removes the convocation with its responses, lineup and missions.
export function ConvocationActionsMenu({ onDelete, isDeleting, errorMessage }: ConvocationActionsMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Actions" variant="ghost" size="icon" className="size-11 text-white hover:bg-transparent hover:text-white/70">
            <IconDots className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" className="h-11" onSelect={() => setConfirmOpen(true)}>
            <IconTrash className="size-4" />
            Supprimer la convocation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette convocation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les réponses, la composition et les missions associées seront supprimées. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                // Keep the dialog open so a failure message stays visible; success navigates away.
                event.preventDefault()
                onDelete()
              }}
              className="h-11 rounded-full"
            >
              {isDeleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
