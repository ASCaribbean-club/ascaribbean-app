import { describe, expect, it } from 'vitest'
import { InvalidPaymentUrlError, InvalidSeasonInputError, PaymentUrlTooLongError } from '../errors/invalid-season-input-error'
import { normalizePaymentUrl, PAYMENT_URL_MAX_LENGTH, shouldShowDuesPaymentLink } from './dues-payment-link-rules'
import { membershipPaymentStatus } from './membership-payment-rules'

const URL_OK = 'https://pay.example.org/cotisation'

describe('shouldShowDuesPaymentLink', () => {
  it('shows the link for an unpaid cotisation with a URL', () => {
    expect(shouldShowDuesPaymentLink('unpaid', URL_OK)).toBe(true)
  })

  it('shows the link for a partial cotisation with a URL', () => {
    expect(shouldShowDuesPaymentLink('partial', URL_OK)).toBe(true)
  })

  it('hides the link once settled', () => {
    expect(shouldShowDuesPaymentLink('paid', URL_OK)).toBe(false)
  })

  it('hides the link on over-payment (computed status is paid)', () => {
    expect(shouldShowDuesPaymentLink(membershipPaymentStatus(13000, 12000), URL_OK)).toBe(false)
  })

  it('hides the link when the amount due is undefined', () => {
    expect(shouldShowDuesPaymentLink('undefined', URL_OK)).toBe(false)
  })

  it('hides the link when the season has no URL, whatever the status', () => {
    expect(shouldShowDuesPaymentLink('unpaid', null)).toBe(false)
    expect(shouldShowDuesPaymentLink('partial', null)).toBe(false)
  })
})

describe('normalizePaymentUrl', () => {
  it('keeps null as null', () => {
    expect(normalizePaymentUrl(null)).toBeNull()
  })

  it('normalizes empty and blank strings to null', () => {
    expect(normalizePaymentUrl('')).toBeNull()
    expect(normalizePaymentUrl('   ')).toBeNull()
  })

  it('accepts an https URL and returns it as typed, trimmed', () => {
    expect(normalizePaymentUrl(`  ${URL_OK}?a=1  `)).toBe(`${URL_OK}?a=1`)
  })

  it('accepts an https URL of exactly 2048 characters', () => {
    const url = `https://a.io/${'x'.repeat(PAYMENT_URL_MAX_LENGTH - 13)}`
    expect(url).toHaveLength(PAYMENT_URL_MAX_LENGTH)
    expect(normalizePaymentUrl(url)).toBe(url)
  })

  it('rejects a URL of 2049 characters with PaymentUrlTooLongError', () => {
    const url = `https://a.io/${'x'.repeat(PAYMENT_URL_MAX_LENGTH - 12)}`
    expect(() => normalizePaymentUrl(url)).toThrow(PaymentUrlTooLongError)
    expect(() => normalizePaymentUrl(url)).toThrow(InvalidSeasonInputError)
  })

  it.each(['http://pay.example.org', 'javascript:alert(1)', 'data:text/html,x', 'pay.example.org', 'https://', 'https://a b.org', 'ftp://x.org'])(
    'rejects %s',
    (value) => {
      expect(() => normalizePaymentUrl(value)).toThrow(InvalidPaymentUrlError)
      expect(() => normalizePaymentUrl(value)).toThrow(InvalidSeasonInputError)
    },
  )
})
