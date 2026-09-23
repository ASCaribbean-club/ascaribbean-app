import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvitationTargetNotInvitedError } from '../../errors/invitation-target-not-invited-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { UserRepository } from '../../repositories/user-repository'
import { ReissueInvitationLinkUseCase, type ReissueInvitationLinkUseCaseInput } from './ReissueInvitationLinkUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function coachUser(): User {
  return {
    id: 'coach-1',
    fullName: 'Coach',
    email: 'coach@example.com',
    roles: [{ role: 'coach', teamIds: ['team-1'] }],
    position: null,
    charterAcceptedAt: null,
  }
}

function invitedMember(): User {
  return { id: 'member-1', fullName: 'Membre invité', email: 'membre@example.com', roles: [{ role: 'player', teamId: 'team-1' }], position: null, charterAcceptedAt: null }
}

function activeMember(): User {
  return {
    id: 'member-2',
    fullName: 'Membre actif',
    email: 'membre2@example.com',
    roles: [{ role: 'player', teamId: 'team-1' }],
    position: null,
    charterAcceptedAt: new Date('2026-01-01'),
  }
}

function fakeUserRepository(usersById: Record<string, User>, overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findById: async (id: string) => usersById[id] ?? null,
    acceptCharter: async () => {},
    findAll: async () => [],
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateFullName: async () => {},
    invite: vi.fn(async () => ({ url: 'https://app.example.com/activation?token_hash=abc&type=invite' })),
    reissueInvitationLink: vi.fn(async () => ({ url: 'https://app.example.com/activation?token_hash=xyz&type=magiclink' })),
    ...overrides,
  }
}

function validInput(overrides: Partial<ReissueInvitationLinkUseCaseInput> = {}): ReissueInvitationLinkUseCaseInput {
  return { actorId: 'admin-1', targetUserId: 'member-1', ...overrides }
}

describe('ReissueInvitationLinkUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new ReissueInvitationLinkUseCase(fakeUserRepository({ 'member-1': invitedMember() }))
    await expect(useCase.execute(validInput({ actorId: 'ghost' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not an admin', async () => {
    const useCase = new ReissueInvitationLinkUseCase(fakeUserRepository({ 'coach-1': coachUser(), 'member-1': invitedMember() }))
    await expect(useCase.execute(validInput({ actorId: 'coach-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws NotFoundError when the target does not exist', async () => {
    const useCase = new ReissueInvitationLinkUseCase(fakeUserRepository({ 'admin-1': adminUser() }))
    await expect(useCase.execute(validInput({ targetUserId: 'ghost' }))).rejects.toThrow(NotFoundError)
  })

  it('throws InvitationTargetNotInvitedError when the target has already accepted the charter', async () => {
    const useCase = new ReissueInvitationLinkUseCase(fakeUserRepository({ 'admin-1': adminUser(), 'member-2': activeMember() }))
    await expect(useCase.execute(validInput({ targetUserId: 'member-2' }))).rejects.toThrow(InvitationTargetNotInvitedError)
  })

  it('returns a fresh link for a still-invited target', async () => {
    const reissueInvitationLink = vi.fn(async () => ({ url: 'https://app.example.com/activation?token_hash=xyz&type=magiclink' }))
    const useCase = new ReissueInvitationLinkUseCase(
      fakeUserRepository({ 'admin-1': adminUser(), 'member-1': invitedMember() }, { reissueInvitationLink }),
    )

    const result = await useCase.execute(validInput())

    expect(reissueInvitationLink).toHaveBeenCalledWith('member-1')
    expect(result).toEqual({ url: 'https://app.example.com/activation?token_hash=xyz&type=magiclink' })
  })
})
