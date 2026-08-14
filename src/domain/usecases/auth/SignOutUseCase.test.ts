import { describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '../../repositories/auth-repository'
import { SignOutUseCase } from './SignOutUseCase'

describe('SignOutUseCase', () => {
  it('delegates to AuthRepository.signOut', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    const authRepository = { signOut } as unknown as AuthRepository

    await new SignOutUseCase(authRepository).execute()

    expect(signOut).toHaveBeenCalledOnce()
  })
})
