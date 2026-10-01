import { useEffect, useState } from 'react'

// A clock that re-renders its caller once a minute, same minute-tick pattern
// as useConvocationDetailViewModel: lets time-window flags (editable /
// attendance entry) flip without a reload. Never a security boundary — the
// use case re-evaluates the window at write time and the database has the
// last word.
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
