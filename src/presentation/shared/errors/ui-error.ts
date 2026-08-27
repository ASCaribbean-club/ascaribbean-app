export type UiErrorVariant = 'toast' | 'inline' | 'blocking'

export interface UiError {
  message: string
  variant: UiErrorVariant
  retryable: boolean
}
