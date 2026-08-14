import { describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '../../repositories/auth-repository'
import { SignInWithPasswordUseCase } from './SignInWithPasswordUseCase'

describe('SignInWithPasswordUseCase', () => {
  it('delegates to AuthRepository.signInWithPassword with the given credentials', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue(undefined)
    const authRepository = { signInWithPassword } as unknown as AuthRepository

    await new SignInWithPasswordUseCase(authRepository).execute({
      email: 'joueur@example.fr',
      password: 'hunter2',
    })

    expect(signInWithPassword).toHaveBeenCalledWith('joueur@example.fr', 'hunter2')
  })
})
