import type { Handedness } from '@domain/entities/user'

// The dialogs hold age as the raw input string; '' means "not set".
export function parseAgeInput(value: string): number | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : Number(trimmed)
}

export function handednessOrNull(value: Handedness | ''): Handedness | null {
  return value === '' ? null : value
}
