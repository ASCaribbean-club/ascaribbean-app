import type { PaymentMethod } from '@domain/entities/payment-method'

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: 'CB',
  cash: 'Espèces',
  transfer: 'Virement',
  other: 'Autre',
}

export function formatPaymentMethod(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}
