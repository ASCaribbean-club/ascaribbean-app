import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTreasurerDependencies } from "@presentation/di/hooks/use-treasurer-dependencies";
import { useAuth } from "@presentation/shared/hooks/use-auth";
import { queryKeys } from "@presentation/shared/query-keys";
import {
  buildReminderConfirmTitle,
  buildReminderFeedback,
  REMINDER_SEND_ERROR,
  type ReminderFeedback,
} from "./reminder-copy";

interface PendingReminder {
  membershipIds: string[];
  title: string;
}

interface Params {
  // Called after a successful call (e.g. leave the selection mode).
  onSent?: () => void;
}

// specs/mobile-treasurer.md amendement (4) — the confirm -> send -> feedback
// flow shared by the list (card, "Tout relancer", selection) and the
// dashboard ("À relancer" rows). SendDuesRemindersUseCase checks 'dues:remind'
// and writes the 'dues.reminder_sent' audit entries; the controls' visibility
// is the callers' `canRemind`. The call is atomic: on error nothing was sent,
// the caller keeps its selection and may retry.
export function useDuesReminderFlow({ onSent }: Params = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { sendDuesRemindersUseCase } = useTreasurerDependencies();

  const [pending, setPending] = useState<PendingReminder | null>(null);
  const [feedback, setFeedback] = useState<ReminderFeedback | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (feedback === null) return;
    const timer = setTimeout(() => setFeedback(null), feedback.durationMs);
    return () => clearTimeout(timer);
  }, [feedback]);

  const mutation = useMutation({
    mutationFn: (membershipIds: string[]) => {
      if (!user) throw new Error("No authenticated session.");
      return sendDuesRemindersUseCase.execute({
        actorId: user.id,
        membershipIds,
      });
    },
    onSuccess: (summary) => {
      // The reminder state, counts and buttons refresh without a reload; the
      // notifications prefix covers a Treasurer reminding themselves.
      void queryClient.invalidateQueries({ queryKey: queryKeys.treasurerDues() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsRoot() });
      setPending(null);
      setFeedback(buildReminderFeedback(summary.sentCount, summary.notSentCount));
      onSent?.();
    },
    onError: () => {
      setPending(null);
      setErrorMessage(REMINDER_SEND_ERROR);
    },
  });

  return {
    confirmTitle: pending?.title ?? null,
    isConfirmOpen: pending !== null,
    isSending: mutation.isPending,
    feedback,
    errorMessage,
    requestReminder: (membershipIds: string[], name?: string) => {
      if (membershipIds.length === 0) return;
      setErrorMessage(null);
      setFeedback(null);
      setPending({
        membershipIds,
        title: buildReminderConfirmTitle(membershipIds.length, name),
      });
    },
    confirm: () => {
      if (pending === null || mutation.isPending) return;
      mutation.mutate(pending.membershipIds);
    },
    cancel: () => {
      if (mutation.isPending) return;
      setPending(null);
    },
  };
}
