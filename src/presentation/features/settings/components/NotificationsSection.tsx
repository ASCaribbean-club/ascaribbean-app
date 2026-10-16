import { useState } from 'react'
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Switch } from '@presentation/shared/components/ui/switch'
import { NotificationsInfoDialog } from './NotificationsInfoDialog'

interface NotificationsSectionProps {
  isLoading: boolean
  isChecked: boolean
  isSwitchDisabled: boolean
  statusLabel: string
  infoAlertText: string | null
  hasToggleError: boolean
  onToggle: (checked: boolean) => void
}

// specs/mob-notifications.md UI design §2 — ONE card: switch row (the whole
// row is the touch target), status area, short description + "i" button.
// Only renders what the ViewModel computed.
export function NotificationsSection(props: NotificationsSectionProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 px-4.5 py-4">
      {props.isLoading ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : (
        <label className="flex min-h-16 cursor-pointer items-center gap-3">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-bold text-white">Notifications sur cet appareil</span>
            <span className="text-[12.5px] text-white/60">{props.statusLabel}</span>
          </span>
          <Switch
            className="shrink-0"
            checked={props.isChecked}
            disabled={props.isSwitchDisabled}
            onCheckedChange={props.onToggle}
          />
        </label>
      )}

      {props.infoAlertText && (
        <Alert>
          <IconAlertCircle />
          <AlertDescription>{props.infoAlertText}</AlertDescription>
        </Alert>
      )}
      {props.hasToggleError && (
        <Alert variant="destructive">
          <IconAlertCircle />
          <AlertDescription>Impossible de modifier les notifications pour le moment. Réessayez dans un instant.</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[13px] text-white/60">
          Reçois sur cet appareil tes rappels de convocation, de vote et de cotisation, et l'annonce de l'homme du match. Ce
          réglage ne concerne que cet appareil.
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 rounded-full bg-white/8 text-white hover:bg-white/15"
          aria-label="Voir le détail des notifications reçues"
          onClick={() => setIsInfoOpen(true)}
        >
          <IconInfoCircle className="size-5" />
        </Button>
      </div>
      <NotificationsInfoDialog open={isInfoOpen} onOpenChange={setIsInfoOpen} />
    </div>
  )
}
