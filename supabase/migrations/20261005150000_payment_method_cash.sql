-- Adds 'cash' to the payment method referential.
-- Mirrors src/domain/entities/payment-method.ts PAYMENT_METHODS (CLAUDE.md §7):
-- change both together.
alter table public.membership_payments
  drop constraint membership_payments_payment_method_check;

alter table public.membership_payments
  add constraint membership_payments_payment_method_check
  check (payment_method in ('card', 'cash', 'transfer', 'other'));
