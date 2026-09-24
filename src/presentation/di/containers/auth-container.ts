import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthRepositoryImpl } from '@data/repositories/AuthRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { AuthRepository } from '@domain/repositories/auth-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { AcceptCharterUseCase } from '@domain/usecases/auth/AcceptCharterUseCase'
import { GetCurrentUserUseCase } from '@domain/usecases/auth/GetCurrentUserUseCase'
import { SignInWithPasswordUseCase } from '@domain/usecases/auth/SignInWithPasswordUseCase'
import { SignOutUseCase } from '@domain/usecases/auth/SignOutUseCase'
import { UpdatePasswordUseCase } from '@domain/usecases/auth/UpdatePasswordUseCase'
import { VerifyAuthLinkUseCase } from '@domain/usecases/auth/VerifyAuthLinkUseCase'

export interface AuthContainer {
  authRepository: AuthRepository
  userRepository: UserRepository
  signInWithPasswordUseCase: SignInWithPasswordUseCase
  updatePasswordUseCase: UpdatePasswordUseCase
  verifyAuthLinkUseCase: VerifyAuthLinkUseCase
  signOutUseCase: SignOutUseCase
  getCurrentUserUseCase: GetCurrentUserUseCase
  acceptCharterUseCase: AcceptCharterUseCase
}

export function createAuthContainer(supabaseClient: SupabaseClient): AuthContainer {
  const authRepository = new AuthRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)

  return {
    authRepository,
    userRepository,
    signInWithPasswordUseCase: new SignInWithPasswordUseCase(authRepository),
    updatePasswordUseCase: new UpdatePasswordUseCase(authRepository),
    verifyAuthLinkUseCase: new VerifyAuthLinkUseCase(authRepository),
    signOutUseCase: new SignOutUseCase(authRepository),
    getCurrentUserUseCase: new GetCurrentUserUseCase(userRepository),
    acceptCharterUseCase: new AcceptCharterUseCase(userRepository),
  }
}
