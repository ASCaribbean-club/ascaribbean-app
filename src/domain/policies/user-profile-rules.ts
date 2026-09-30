export const MIN_USER_AGE = 1
export const MAX_USER_AGE = 120

// null = "not set", always valid. Mirrors the CHECK constraint on
// public.users.age (20260930172452_user_age_handedness.sql).
export function isValidUserAge(age: number | null): boolean {
  return age === null || (Number.isInteger(age) && age >= MIN_USER_AGE && age <= MAX_USER_AGE)
}
