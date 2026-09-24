import { describe, expect, it, vi } from 'vitest'
import { AuthLinkInvalidError } from '../../errors/auth-link-invalid-error'
import type { AuthRepository } from '../../repositories/auth-repository'
import { VerifyAuthLinkUseCase } from './VerifyAuthLinkUseCase'

function fakeAuthRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    getSession: async () => null,
    onSessionChange: () => () => {},
    signInWithPassword: async () => {},
    verifyAuthLink: vi.fn(async () => {}),
    updatePassword: async () => {},
    signOut: async () => {},
    ...overrides,
  }
}

describe('VerifyAuthLinkUseCase', () => {
  it('calls through to the repository with the token hash and type', async () => {
    const verifyAuthLink = vi.fn(async () => {})
    const useCase = new VerifyAuthLinkUseCase(fakeAuthRepository({ verifyAuthLink }))

    await useCase.execute({ tokenHash: 'abc', type: 'invite' })

    expect(verifyAuthLink).toHaveBeenCalledWith('abc', 'invite')
  })

  it('accepts the recovery link type used by password-reset', async () => {
    const verifyAuthLink = vi.fn(async () => {})
    const useCase = new VerifyAuthLinkUseCase(fakeAuthRepository({ verifyAuthLink }))

    await useCase.execute({ tokenHash: 'abc', type: 'recovery' })

    expect(verifyAuthLink).toHaveBeenCalledWith('abc', 'recovery')
  })

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    const useCase = new VerifyAuthLinkUseCase(
      fakeAuthRepository({
        verifyAuthLink: vi.fn(async () => {
          throw new AuthLinkInvalidError('expired')
        }),
      }),
    )

    await expect(useCase.execute({ tokenHash: 'abc', type: 'magiclink' })).rejects.toThrow(AuthLinkInvalidError)
  })
})
