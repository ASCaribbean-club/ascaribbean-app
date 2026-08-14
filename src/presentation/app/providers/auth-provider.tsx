import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import type { User } from '@domain/entities/user'
import { useAuthDependencies } from '../../di/hooks/use-auth-dependencies'

interface AuthState {
  user: User | null
  isLoading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const { authRepository, getCurrentUserUseCase } = useAuthDependencies()
  const [state, setState] = useState<Omit<AuthState, 'refreshUser'>>({ user: null, isLoading: true })
  const userIdRef = useRef<string | null>(null)

  const loadUser = useCallback(
    async (userId: string | null) => {
      if (!userId) {
        setState({ user: null, isLoading: false })
        return
      }
      setState((prev) => ({ ...prev, isLoading: true }))
      try {
        const user = await getCurrentUserUseCase.execute({ userId })
        setState({ user, isLoading: false })
      } catch {
        setState({ user: null, isLoading: false })
      }
    },
    [getCurrentUserUseCase],
  )

  useEffect(() => {
    // onSessionChange fires immediately with the current session on
    // subscribe (Supabase's INITIAL_SESSION event), so there's no separate
    // getSession() call needed. Same userId (e.g. a TOKEN_REFRESHED event)
    // is skipped to avoid re-fetching the profile and flashing the UI.
    const unsubscribe = authRepository.onSessionChange((session) => {
      const userId = session?.userId ?? null
      if (userId === userIdRef.current) return
      userIdRef.current = userId
      void loadUser(userId)
    })
    return unsubscribe
  }, [authRepository, loadUser])

  const refreshUser = useCallback(() => loadUser(userIdRef.current), [loadUser])

  return <AuthContext.Provider value={{ ...state, refreshUser }}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
