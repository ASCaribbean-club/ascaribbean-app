import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { PushNotificationState } from '@domain/policies/push-notification-state'
import { usePushNotificationsDependencies } from '@presentation/di/hooks/use-push-notifications-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/mob-notifications.md UI design §2 — the four states of the switch
// (AC-NT-14) plus loading/busy/error. Every browser call goes through a use
// case; the page only renders the values below.
const STATUS_LABELS: Record<PushNotificationState, string> = {
  enabled: 'Activées sur cet appareil.',
  disabled: 'Désactivées sur cet appareil.',
  denied: 'Bloquées par ton appareil.',
  unsupported: 'Indisponibles ici.',
  'unsupported-ios-not-installed': 'Indisponibles ici.',
}

const ALERT_TEXTS: Partial<Record<PushNotificationState, string>> = {
  denied:
    "Les notifications sont bloquées pour cette application. Pour les activer, ouvre les réglages de ton appareil ou de ton navigateur et autorise les notifications pour AS Caribbean.",
  'unsupported-ios-not-installed':
    "Sur iPhone, ajoute d'abord l'application à l'écran d'accueil (bouton Partager, puis « Sur l'écran d'accueil »), puis ouvre-la depuis son icône.",
  unsupported: 'Ce navigateur ne permet pas les notifications. Tu retrouves tout dans l\'application.',
}

export function useSettingsViewModel() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { getPushNotificationStateUseCase, changePushNotificationPreferenceUseCase } = usePushNotificationsDependencies()
  const userId = user!.id
  const stateKey = queryKeys.pushNotificationState(userId)
  const [hasToggleError, setHasToggleError] = useState(false)

  // Re-read on every return to the foreground (the user may have changed the
  // system permission in the device settings).
  const stateQuery = useQuery({
    queryKey: stateKey,
    queryFn: () => getPushNotificationStateUseCase.execute(),
    refetchOnWindowFocus: 'always',
  })

  const toggleMutation = useMutation({
    // Off = explicit opt-out remembered by the use case (AC-NT-38).
    mutationFn: (wantEnabled: boolean) => changePushNotificationPreferenceUseCase.execute(userId, wantEnabled),
    onMutate: () => setHasToggleError(false),
    onError: () => setHasToggleError(true),
    // Success, dismissed prompt or failure: always fall back to the REAL state.
    onSettled: () => queryClient.invalidateQueries({ queryKey: stateKey }),
  })

  const state = stateQuery.data
  const isLoading = stateQuery.isPending
  const isBusy = toggleMutation.isPending
  const canToggle = state === 'enabled' || state === 'disabled'

  return {
    onBack: () => navigate('/menu'),
    isLoading,
    isLoadError: stateQuery.isError,
    isChecked: state === 'enabled',
    isSwitchDisabled: !canToggle || isBusy,
    statusLabel: isBusy ? 'En cours…' : state ? STATUS_LABELS[state] : '',
    infoAlertText: state ? (ALERT_TEXTS[state] ?? null) : null,
    hasToggleError,
    onToggle: (checked: boolean) => toggleMutation.mutate(checked),
  }
}
