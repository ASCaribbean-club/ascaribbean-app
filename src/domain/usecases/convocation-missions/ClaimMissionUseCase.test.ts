import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { MissionDeadlinePassedError } from '@domain/errors/mission-deadline-passed-error'
import { MissionFullError } from '@domain/errors/mission-full-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { ClaimMissionUseCase } from './ClaimMissionUseCase'
import {
  AT_DEADLINE,
  BEFORE_DEADLINE,
  CONVOCATION_ID,
  aConvocation,
  coachOfTeam,
  fakeConvocationRepository,
  fakeMissionRepository,
  fakeRespondersRepository,
  fakeTeamRepository,
  fakeUserRepository,
  playerAndAdmin,
  playerUser,
  treasurerUser,
} from './convocation-mission-fakes'
import type { User } from '@domain/entities/user'
import type { ConvocationMissionRepository } from '@domain/repositories/convocation-mission-repository'
import type { Convocation } from '@domain/entities/convocation'

function build(user: User | null, now: Date, rosterIds: string[], missionRepo: ConvocationMissionRepository, convocation: Convocation | null = aConvocation()) {
  return new ClaimMissionUseCase(
    fakeUserRepository(user),
    fakeConvocationRepository(convocation),
    fakeTeamRepository(),
    fakeRespondersRepository(rosterIds),
    missionRepo,
    () => now,
  )
}

const input = (actorId: string) => ({ actorId, convocationId: CONVOCATION_ID, missionId: 'mission-1' })

describe('ClaimMissionUseCase', () => {
  it('registers an eligible player of the team before the deadline', async () => {
    const repo = fakeMissionRepository()
    const result = await build(playerUser(), BEFORE_DEADLINE, ['player-1'], repo).execute(input('player-1'))

    expect(repo.claim).toHaveBeenCalledWith('mission-1', 'player-1')
    expect(result.userId).toBe('player-1')
  })

  it('throws ForbiddenError for an unknown actor, without any write', async () => {
    const repo = fakeMissionRepository()
    await expect(build(null, BEFORE_DEADLINE, [], repo).execute(input('x'))).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.claim).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when the convocation does not exist', async () => {
    const repo = fakeMissionRepository()
    await expect(build(playerUser(), BEFORE_DEADLINE, ['player-1'], repo, null).execute(input('player-1'))).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws ForbiddenError without mission:self-assign BEFORE any other check, even past the deadline', async () => {
    const repo = fakeMissionRepository()
    const responders = fakeRespondersRepository([])
    for (const user of [treasurerUser(), coachOfTeam(), playerUser('p2', 'other-team')]) {
      const useCase = new ClaimMissionUseCase(
        fakeUserRepository(user),
        fakeConvocationRepository(),
        fakeTeamRepository(),
        responders,
        repo,
        () => AT_DEADLINE,
      )
      await expect(useCase.execute(input(user.id))).rejects.toBeInstanceOf(ForbiddenError)
    }
    expect(responders.listForConvocation).not.toHaveBeenCalled()
    expect(repo.claim).not.toHaveBeenCalled()
  })

  it('throws ForbiddenError when the actor is not in the eligible list', async () => {
    const repo = fakeMissionRepository()
    await expect(build(playerUser(), BEFORE_DEADLINE, ['someone-else'], repo).execute(input('player-1'))).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.claim).not.toHaveBeenCalled()
  })

  it('throws MissionDeadlinePassedError exactly at start minus 30 min, with no repository call', async () => {
    const repo = fakeMissionRepository()
    await expect(build(playerUser(), AT_DEADLINE, ['player-1'], repo).execute(input('player-1'))).rejects.toBeInstanceOf(MissionDeadlinePassedError)
    expect(repo.claim).not.toHaveBeenCalled()
  })

  it('throws MissionDeadlinePassedError for a player on a closed convocation, before the deadline', async () => {
    const repo = fakeMissionRepository()
    const useCase = build(playerUser(), BEFORE_DEADLINE, ['player-1'], repo, aConvocation({ status: 'closed' }))
    await expect(useCase.execute(input('player-1'))).rejects.toBeInstanceOf(MissionDeadlinePassedError)
    expect(repo.claim).not.toHaveBeenCalled()
  })

  // R4/AC-MM-14 — the exemption follows the action, not a role list.
  it('never refuses a holder of mission:manage for the deadline, even for their own registration', async () => {
    const repo = fakeMissionRepository()
    await build(playerAndAdmin(), AT_DEADLINE, ['player-admin-1'], repo).execute(input('player-admin-1'))

    expect(repo.claim).toHaveBeenCalledWith('mission-1', 'player-admin-1')
  })

  it('propagates MissionFullError from the repository', async () => {
    const repo = fakeMissionRepository({ claim: async () => { throw new MissionFullError('mission_full') } })
    await expect(build(playerUser(), BEFORE_DEADLINE, ['player-1'], repo).execute(input('player-1'))).rejects.toBeInstanceOf(MissionFullError)
  })
})
