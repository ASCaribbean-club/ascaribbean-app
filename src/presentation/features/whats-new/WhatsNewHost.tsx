import { WhatsNewDialog } from './components/WhatsNewDialog'
import { useWhatsNewViewModel } from './useWhatsNewViewModel'

// Mounted once under the authenticated + charter-accepted route layer
// (router.tsx), so it covers AppShell AND the pushed routes, but never the
// login screen (it would consume the "seen" marker unread).
export function WhatsNewHost() {
  const vm = useWhatsNewViewModel()
  if (vm.releases.length === 0) return null
  return (
    <WhatsNewDialog
      open={vm.isOpen}
      onOpenChange={vm.onOpenChange}
      releases={vm.releases}
      currentVersion={vm.currentVersion}
      activationAlertVariant={vm.activationAlertVariant}
      onActivationAlertAction={vm.onActivationAlertAction}
    />
  )
}
