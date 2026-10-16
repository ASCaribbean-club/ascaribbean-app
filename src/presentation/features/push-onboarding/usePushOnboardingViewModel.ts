import { usePushOnboarding } from '@presentation/shared/hooks/use-push-onboarding'

// Mounting is the trigger: every signed-in launch and login (session + charter)
// runs the silent re-sync. No UI, nothing for the user to do (AC-NT-37).
export function usePushOnboardingViewModel() {
  usePushOnboarding()
}
