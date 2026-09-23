import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthRepositoryImpl } from '@data/repositories/AuthRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { AuthRepository } from '@domain/repositories/auth-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { AcceptCharterUseCase } from '@domain/usecases/auth/AcceptCharterUseCase'
import { CheckRecoveryLinkUseCase } from '@domain/usecases/auth/CheckRecoveryLinkUseCase'
import { GetCurrentUserUseCase } from '@domain/usecases/auth/GetCurrentUserUseCase'
import { RequestMagicLinkUseCase } from '@domain/usecases/auth/RequestMagicLinkUseCase'
import { RequestPasswordResetUseCase } from '@domain/usecases/auth/RequestPasswordResetUseCase'
import { SignInWithPasswordUseCase } from '@domain/usecases/auth/SignInWithPasswordUseCase'
import { SignOutUseCase } from '@domain/usecases/auth/SignOutUseCase'
import { UpdatePasswordUseCase } from '@domain/usecases/auth/UpdatePasswordUseCase'
import { VerifyInvitationLinkUseCase } from '@domain/usecases/auth/VerifyInvitationLinkUseCase'

export interface AuthContainer {
  authRepository: AuthRepository
  userRepository: UserRepository
  signInWithPasswordUseCase: SignInWithPasswordUseCase
  requestMagicLinkUseCase: RequestMagicLinkUseCase
  requestPasswordResetUseCase: RequestPasswordResetUseCase
  checkRecoveryLinkUseCase: CheckRecoveryLinkUseCase
  updatePasswordUseCase: UpdatePasswordUseCase
  verifyInvitationLinkUseCase: VerifyInvitationLinkUseCase
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
    requestMagicLinkUseCase: new RequestMagicLinkUseCase(authRepository),
    requestPasswordResetUseCase: new RequestPasswordResetUseCase(authRepository),
    checkRecoveryLinkUseCase: new CheckRecoveryLinkUseCase(authRepository),
    updatePasswordUseCase: new UpdatePasswordUseCase(authRepository),
    verifyInvitationLinkUseCase: new VerifyInvitationLinkUseCase(authRepository),
    signOutUseCase: new SignOutUseCase(authRepository),
    getCurrentUserUseCase: new GetCurrentUserUseCase(userRepository),
    acceptCharterUseCase: new AcceptCharterUseCase(userRepository),
  }
}
