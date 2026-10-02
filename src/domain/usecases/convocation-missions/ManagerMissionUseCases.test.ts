import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidMissionTemplateError } from '@domain/errors/invalid-mission-template-error'
import { MissionFullError } from '@domain/errors/mission-full-error'
import type { User } from '@domain/entities/user'
import { AddAdHocMissionUseCase } from './AddAdHocMissionUseCase'
import { AssignMemberToMissionUseCase } from './AssignMemberToMissionUseCase'
import { ListConvocationMissionsUseCase } from './ListConvocationMissionsUseCase'
import { RemoveMemberFromMissionUseCase } from './RemoveMemberFromMissionUseCase'
import { RemoveMissionUseCase } from './RemoveMissionUseCase'
import {
  CONVOCATION_ID,
  coachOfTeam,
  fakeConvocationRepository,
  fakeMissionRepository,
  fakeRespondersRepository,
  fakeTeamRepository,
  fakeUserRepository,
  playerUser,
  treasurerUser,
} from './convocation-mission-fakes'

const base = { actorId: 'x', convocationId: CONVOCATION_ID }

function deps(user: User | null, rosterIds: string[] = ['player-1']) {
  return {
    users: fakeUserRepository(user),
    convocations: fakeConvocationRepository(),
    teams: fakeTeamRepository(),
    responders: fakeRespondersRepository(rosterIds),
    missions: fakeMissionRepository(),
  }
}

describe('ListConvocationMissionsUseCase', () => {
  it('delegates to the repository without any authorization check (RLS only)', async () => {
    const missions = fakeMissionRepository()
    await new ListConvocationMissionsUseCase(missions).execute(CONVOCATION_ID)
    expect(missions.listForConvocation).toHaveBeenCalledWith(CONVOCATION_ID)
  })
})

describe('AssignMemberToMissionUseCase', () => {
  const run = (d: ReturnType<typeof deps>, targetUserId = 'player-1') =>
    new AssignMemberToMissionUseCase(d.users, d.convocations, d.teams, d.responders, d.missions).execute({
      ...base,
      missionId: 'mission-1',
      targetUserId,
    })

  it('lets a coach register an eligible player, after the start too (no deadline)', async () => {
    const d = deps(coachOfTeam())
    await run(d)
    expect(d.missions.claim).toHaveBeenCalledWith('mission-1', 'player-1')
  })

  it('throws ForbiddenError for a player and a treasurer, before the eligibility read', async () => {
    for (const user of [playerUser(), treasurerUser()]) {
      const d = deps(user)
      await expect(run(d)).rejects.toBeInstanceOf(ForbiddenError)
      expect(d.responders.listForConvocation).not.toHaveBeenCalled()
      expect(d.missions.claim).not.toHaveBeenCalled()
    }
  })

  it('throws ForbiddenError when the target is not eligible', async () => {
    const d = deps(coachOfTeam(), ['someone-else'])
    await expect(run(d)).rejects.toBeInstanceOf(ForbiddenError)
    expect(d.missions.claim).not.toHaveBeenCalled()
  })

  it('propagates MissionFullError from the repository', async () => {
    const d = deps(coachOfTeam())
    d.missions.claim = async () => { throw new MissionFullError('mission_full') }
    await expect(run(d)).rejects.toBeInstanceOf(MissionFullError)
  })
})

describe('RemoveMemberFromMissionUseCase', () => {
  const run = (d: ReturnType<typeof deps>) =>
    new RemoveMemberFromMissionUseCase(d.users, d.convocations, d.teams, d.missions).execute({
      ...base,
      missionId: 'mission-1',
      targetUserId: 'player-1',
    })

  it('lets a coach remove a member', async () => {
    const d = deps(coachOfTeam())
    await run(d)
    expect(d.missions.release).toHaveBeenCalledWith('mission-1', 'player-1')
  })

  it('throws ForbiddenError for a player', async () => {
    const d = deps(playerUser())
    await expect(run(d)).rejects.toBeInstanceOf(ForbiddenError)
    expect(d.missions.release).not.toHaveBeenCalled()
  })
})

describe('AddAdHocMissionUseCase', () => {
  const run = (d: ReturnType<typeof deps>, label: string, capacity: number) =>
    new AddAdHocMissionUseCase(d.users, d.convocations, d.teams, d.missions).execute({ ...base, label, capacity })

  it('trims the label and creates the mission', async () => {
    const d = deps(coachOfTeam())
    await run(d, '  Installer les barrières ', 2)
    expect(d.missions.addAdHoc).toHaveBeenCalledWith({ convocationId: CONVOCATION_ID, label: 'Installer les barrières', capacity: 2 })
  })

  it('throws ForbiddenError for a non-manager BEFORE validating the input', async () => {
    const d = deps(playerUser())
    await expect(run(d, '', 9)).rejects.toBeInstanceOf(ForbiddenError)
    expect(d.missions.addAdHoc).not.toHaveBeenCalled()
  })

  it.each([
    ['empty label', '', 1],
    ['whitespace-only label', '   ', 1],
    ['capacity 0', 'Eau', 0],
    ['capacity 4', 'Eau', 4],
    ['fractional capacity', 'Eau', 1.5],
  ])('rejects %s without any repository call', async (_name, label, capacity) => {
    const d = deps(coachOfTeam())
    await expect(run(d, label, capacity)).rejects.toBeInstanceOf(InvalidMissionTemplateError)
    expect(d.missions.addAdHoc).not.toHaveBeenCalled()
  })
})

describe('RemoveMissionUseCase', () => {
  const run = (d: ReturnType<typeof deps>) =>
    new RemoveMissionUseCase(d.users, d.convocations, d.teams, d.missions).execute({ ...base, missionId: 'mission-1' })

  it('lets a coach delete a mission', async () => {
    const d = deps(coachOfTeam())
    await run(d)
    expect(d.missions.remove).toHaveBeenCalledWith('mission-1')
  })

  it('throws ForbiddenError for a player', async () => {
    const d = deps(playerUser())
    await expect(run(d)).rejects.toBeInstanceOf(ForbiddenError)
    expect(d.missions.remove).not.toHaveBeenCalled()
  })
})
