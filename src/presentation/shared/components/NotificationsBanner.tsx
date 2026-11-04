import { IconBell, IconX } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'
import { useNotificationsBannerViewModel } from '@presentation/shared/hooks/useNotificationsBannerViewModel'

// Dismissible dashboard banner: notifications can be enabled in Menu >
// Paramètres. Tapping the card opens Settings; the close (X) button dismisses
// it for good on this device. Absence, never an empty state, when there is
// nothing to show. Geometry borrowed from DuesReminderBanner, sky tint (an
// invitation, not a warning).
export function NotificationsBanner() {
  const vm = useNotificationsBannerViewModel()
  if (!vm.showBanner) return null

  return (
    <section
      role="status"
      aria-label="Activer les notifications"
      className="relative flex flex-col gap-1 rounded-2xl border border-sky-300/30 bg-sky-500/10 px-3.5 py-3"
    >
      <button
        type="button"
        onClick={vm.onOpenSettings}
        aria-label="Ouvrir les paramètres de notifications"
        className="flex w-full min-w-0 flex-col gap-1 text-left"
      >
        <div className="flex min-w-0 items-center gap-2 pr-9">
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
            <IconBell className="size-4 text-sky-200" />
          </span>
          <span className="min-w-0 truncate text-[10.5px] font-extrabold tracking-wider text-sky-200 uppercase">
            Notifications
          </span>
        </div>
        <span className="text-[15px] font-bold text-white">Ne manquez plus rien</span>
        <span className="text-[13px] text-white/80">
          Activez les notifications dans Menu &gt; Paramètres.
        </span>
      </button>
      {/* 44px hit area (CLAUDE.md §6), icon kept small; overlaps the card's top-right padding. */}
      <Button
        type="button"
        variant="ghost"
        onClick={vm.onDismiss}
        aria-label="Masquer le message sur les notifications"
        className="absolute top-0 right-0 size-11 rounded-full p-0 text-sky-100 hover:bg-sky-500/15 hover:text-sky-50"
      >
        <IconX className="size-4.5" aria-hidden />
      </Button>
    </section>
  )
}
