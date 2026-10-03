import { useCallback, useState } from 'react'

// Boolean UI preference kept in localStorage, so it survives reloads on this
// device only (a per-device convenience, not account data — nothing is sent
// to Supabase). Callers scope the key per user (e.g. `…:${user.id}`) so two
// accounts sharing a browser don't share the preference. Every storage access
// is wrapped: private mode / blocked storage must degrade to in-memory state,
// never throw during render.
export function usePersistedBoolean(key: string, initialValue: boolean): [boolean, () => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored === null ? initialValue : stored === 'true'
    } catch {
      return initialValue
    }
  })

  const toggle = useCallback(() => {
    setValue((current) => {
      const next = !current
      try {
        window.localStorage.setItem(key, String(next))
      } catch {
        // Storage unavailable — keep the in-memory value only.
      }
      return next
    })
  }, [key])

  return [value, toggle]
}
