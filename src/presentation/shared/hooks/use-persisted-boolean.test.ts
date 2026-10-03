import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePersistedBoolean } from './use-persisted-boolean'

describe('usePersistedBoolean', () => {
  beforeEach(() => window.localStorage.clear())

  it('starts from the initial value when nothing is stored', () => {
    const { result } = renderHook(() => usePersistedBoolean('k', false))
    expect(result.current[0]).toBe(false)
  })

  it('persists the toggled value and restores it on the next mount', () => {
    const first = renderHook(() => usePersistedBoolean('k', false))
    act(() => first.result.current[1]())
    expect(first.result.current[0]).toBe(true)

    const second = renderHook(() => usePersistedBoolean('k', false))
    expect(second.result.current[0]).toBe(true)
  })

  it('keeps keys independent (per-user scoping)', () => {
    const a = renderHook(() => usePersistedBoolean('k:user-a', false))
    act(() => a.result.current[1]())

    const b = renderHook(() => usePersistedBoolean('k:user-b', false))
    expect(b.result.current[0]).toBe(false)
  })
})
