import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PAYMENT_METHODS, type PaymentMethod } from "@domain/entities/payment-method";
import {
  validatePaymentAmount,
  validatePaymentDate,
  type PaymentAmountError,
  type PaymentDateError,
} from "@domain/rules/payment-form-rules";
import { useTreasurerDependencies } from "@presentation/di/hooks/use-treasurer-dependencies";
import { mapDomainErrorToUiError } from "@presentation/shared/errors/map-domain-error-to-ui-error";
import { eurosToCents } from "@presentation/shared/formatters/currency";
import { toDateInputValue } from "@presentation/shared/formatters/date-input";
import { formatPaymentMethod } from "@presentation/shared/formatters/payment-method-labels";
import { useAuth } from "@presentation/shared/hooks/use-auth";
import { useFinanceCarrierOptions } from "@presentation/shared/hooks/use-finance-carriers";
import { queryKeys } from "@presentation/shared/query-keys";

const AMOUNT_MESSAGES: Record<PaymentAmountError, string> = {
  required: "Saisissez un montant.",
  "not-positive": "Le montant doit être supérieur à 0.",
  "too-many-decimals": "Le montant ne peut avoir plus de 2 décimales.",
};
const DATE_MESSAGES: Record<PaymentDateError, string> = {
  required: "Saisissez la date du versement.",
  "in-future": "La date du versement ne peut pas être dans le futur.",
};

interface Params {
  membershipId: string;
  // Called once the payment is recorded (the dialog closes, the list shows
  // the confirmation).
  onRecorded: (amountCents: number) => void;
}

// specs/mobile-treasurer.md amendement UI du 2026-10-05 (3) — "Enregistrer un
// paiement". Reuses RecordPaymentUseCase unchanged: the audit entry is
// emitted by that use case, never from a component or from here. 'payment:record'
// is checked by the use case; the button's visibility is the list VM's
// `canRecordPayment`.
export function useRecordDuePaymentViewModel({ membershipId, onRecorded }: Params) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { recordPaymentUseCase } = useTreasurerDependencies();

  const today = toDateInputValue(new Date());
  const [amountEuros, setAmountEuros] = useState("");
  const [paidAt, setPaidAt] = useState(today);
  // '' = "Non précisé" (optional field).
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  // specs/mob-treasurer-finances.md AC-FI-31 — optional "Porteur", '' = "Non précisé".
  const carrierOptions = useFinanceCarrierOptions();
  const [carrierId, setCarrierId] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("No authenticated session.");
      return recordPaymentUseCase.execute({
        actorId: user.id,
        membershipId,
        // Euros → integer cents at the presentation/domain boundary.
        amountCents: eurosToCents(Number(amountEuros)),
        paidAt,
        paymentMethod: paymentMethod === "" ? null : paymentMethod,
        carrierId: carrierId === "" ? null : carrierId,
      });
    },
    onSuccess: (payment) => {
      // AC-TR-18 — centralised keys: the aggregated dues read (list,
      // dashboard, banner), the admin memberships screens and their badge,
      // and the profile membership.
      void queryClient.invalidateQueries({ queryKey: queryKeys.treasurerDues() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsAdminList() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipPaymentsAdminList() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipPayments(membershipId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsBadgeCount() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileAll() });
      // AC-FI-33 — "Entrées saison" and the carrier balance move.
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() });
      onRecorded(payment.amountCents);
    },
  });

  const amountError = validatePaymentAmount(amountEuros);
  const dateError = validatePaymentDate(paidAt, today);

  return {
    amountEuros,
    setAmountEuros,
    paidAt,
    setPaidAt,
    maxPaidAt: today,
    // 'none' is a UI-only sentinel: Radix Select forbids an empty item value.
    paymentMethodValue: paymentMethod === "" ? "none" : paymentMethod,
    setPaymentMethodValue: (value: string) =>
      setPaymentMethod(value === "none" ? "" : (value as PaymentMethod)),
    // No carrier configured or readable: the field is not rendered.
    carrierOptions,
    carrierValue: carrierId === "" ? "none" : carrierId,
    setCarrierValue: (value: string) => setCarrierId(value === "none" ? "" : value),
    paymentMethodOptions: PAYMENT_METHODS.map((method) => ({
      value: method,
      label: formatPaymentMethod(method),
    })),

    // Field messages appear on blur or after a submit attempt.
    amountErrorMessage:
      amountTouched && amountError ? AMOUNT_MESSAGES[amountError] : null,
    dateErrorMessage:
      dateTouched && dateError ? DATE_MESSAGES[dateError] : null,
    onAmountBlur: () => setAmountTouched(true),
    onDateBlur: () => setDateTouched(true),

    canSubmit: amountError === null && dateError === null && !mutation.isPending,
    isSubmitting: mutation.isPending,
    errorMessage: mutation.error
      ? mapDomainErrorToUiError(mutation.error).message
      : null,
    submit: () => {
      setAmountTouched(true);
      setDateTouched(true);
      if (amountError !== null || dateError !== null || mutation.isPending) return;
      mutation.mutate();
    },
  };
}
