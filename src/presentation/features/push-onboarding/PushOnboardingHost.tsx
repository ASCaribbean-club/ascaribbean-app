import { usePushOnboardingViewModel } from './usePushOnboardingViewModel'

// Mounted next to WhatsNewHost (router.tsx): runs the silent default
// activation, renders nothing.
export function PushOnboardingHost() {
  usePushOnboardingViewModel()
  return null
}
