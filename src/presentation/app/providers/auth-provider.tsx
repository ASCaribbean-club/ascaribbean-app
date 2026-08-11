import { createContext, useContext, useState, type PropsWithChildren } from 'react'
import type { User } from '@domain/entities/user'

interface AuthState {
  user: User | null
  isLoading: boolean
}

const AuthContext = createContext<AuthState | null>(null)

// TODO: wire to the Supabase session once the Authentification module lands.
export function AuthProvider({ children }: PropsWithChildren) {
  const [state] = useState<AuthState>({ user: null, isLoading: false })

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
