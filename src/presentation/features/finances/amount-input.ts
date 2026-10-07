import { eurosToCents } from '@presentation/shared/formatters/currency'

// Integer cents -> the text of an amount field ("38", "12.34"), for prefilling a
// correction sheet. Cents are integers, so String() never shows float noise.
export function centsToAmountInput(cents: number): string {
  return String(cents / 100)
}

// The reverse, for text already validated by validateMoneyInput().
export function amountInputToCents(text: string): number {
  return eurosToCents(Number(text.trim().replace(',', '.')))
}
