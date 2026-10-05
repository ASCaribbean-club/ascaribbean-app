import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useNotificationsDependencies } from "@presentation/di/hooks/use-notifications-dependencies";
import { formatLongReminderDate } from "@presentation/shared/formatters/dues-reminder-labels";
import { formatEuroAmount } from "@presentation/shared/formatters/currency";
import { useAuth } from "@presentation/shared/hooks/use-auth";
import { queryKeys } from "@presentation/shared/query-keys";

const HIDE_ERROR_MESSAGE = "Impossible de masquer le rappel. Réessayez.";
const HIDE_ERROR_DURATION_MS = 3000;

// specs/mobile-treasurer.md amendement (4), §H and amendement UI (4), (b) — the
// member-side dues reminder banner, shared by the four Dashboard views. A
// secondary read: loading and error render NOTHING (no skeleton, no error, no
// false "up to date"), so it never degrades the dashboard. RLS-only on the
// member's own rows, no matrix entry. Whether the alert is still relevant
// (unread, current-season live membership, remaining amount > 0) is decided by
// GetMyDuesReminderUseCase through isDuesAlertVisible, never here. No
// Realtime, no polling: it refreshes on the next load or window focus.
export function useDuesReminderViewModel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { getMyDuesReminderUseCase, markNotificationReadUseCase } =
    useNotificationsDependencies();

  const userId = user?.id ?? "";
  const queryKey = queryKeys.duesReminder(userId);
  const reminderQuery = useQuery({
    queryKey,
    queryFn: () => getMyDuesReminderUseCase.execute({ userId }),
    enabled: user !== null,
  });

  const [hideErrorMessage, setHideErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (hideErrorMessage === null) return;
    const timer = setTimeout(
      () => setHideErrorMessage(null),
      HIDE_ERROR_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [hideErrorMessage]);

  const hideMutation = useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationReadUseCase.execute({ notificationId }),
    // Optimistic: the banner disappears immediately.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, null);
      setHideErrorMessage(null);
      return { previous };
    },
    // The write failed: the banner comes back with a non-blocking message.
    onError: (_error, _notificationId, context) => {
      queryClient.setQueryData(queryKey, context?.previous ?? null);
      setHideErrorMessage(HIDE_ERROR_MESSAGE);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const reminder = reminderQuery.isError ? null : (reminderQuery.data ?? null);

  return {
    showDuesAlert: reminder !== null,
    seasonLine: reminder
      ? `Saison ${reminder.seasonLabel} : il vous reste ${formatEuroAmount(reminder.remainingCents / 100)} à régler.`
      : "",
    guidanceLine: "Rapprochez-vous du trésorier du club pour régulariser.",
    remindedDateLabel: reminder
      ? formatLongReminderDate(reminder.remindedAt)
      : "",
    onOpenProfile: () => navigate("/profile"),
    isHiding: hideMutation.isPending,
    hideErrorMessage,
    onHide: () => {
      if (reminder === null || hideMutation.isPending) return;
      hideMutation.mutate(reminder.notificationId);
    },
  };
}
