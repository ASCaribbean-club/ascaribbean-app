import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { MenuSectionTitle } from '@presentation/shared/components/MenuSectionTitle'
import { NotificationsSection } from './components/NotificationsSection'
import { useSettingsViewModel } from './useSettingsViewModel'

// specs/mob-notifications.md UI design §2 — pushed route (/settings), no
// BottomNav, sticky BackHeader. One section only: "Notifications".
export function SettingsPage() {
  const vm = useSettingsViewModel()

  return (
    <div className="flex min-h-svh flex-col text-white">
      <BackHeader title="Paramètres" onBack={vm.onBack} />
      <div className="flex flex-col gap-2.5 px-5.5 pt-4 pb-[max(1.375rem,env(safe-area-inset-bottom))]">
        <MenuSectionTitle>Notifications</MenuSectionTitle>
        <NotificationsSection
          isLoading={vm.isLoading}
          isChecked={vm.isChecked}
          isSwitchDisabled={vm.isSwitchDisabled}
          statusLabel={vm.statusLabel}
          infoAlertText={vm.infoAlertText}
          hasToggleError={vm.hasToggleError}
          onToggle={vm.onToggle}
        />
      </div>
    </div>
  )
}
