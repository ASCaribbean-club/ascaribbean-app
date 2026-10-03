import type { Convocation, ConvocationType } from '../entities/convocation'

/**
 * Delta (in minutes), *before* the convocation's start time, past which a
 * player can no longer respond (present/absent). Keyed by `ConvocationType`
 * because the tolerance is not the same for a training (players are expected
 * to answer almost up to the last minute) as for a match (the coach needs a
 * stable headcount well ahead of kickoff to plan the line-up).
 *
 * Example: for a `training` starting at 18:00, the deadline is 17:50 —
 * `canPlayerRespond` returns `false` from that point on, regardless of the
 * exact current time.
 *
 */
const RESPONSE_DEADLINE_MINUTES: Record<ConvocationType, number> = {
  training: 10,
  match: 60,
  meeting: 60, // TODO ⚠️ OPEN — placeholder value, not confirmed by the developer yet. Flag this in code review, do not silently treat as final.
}

/**
 * The instant from which a player can no longer respond (present/absent) to a
 * convocation of this type starting at `startsAt`. Single source of truth for
 * the response deadline: `canPlayerRespond` and `getConvocationCreationWindow`
 * (convocation-creation-window.ts) both read it, so the delta is never
 * duplicated.
 */
export function getResponseDeadline(type: ConvocationType, startsAt: Date): Date {
  const deadline = new Date(startsAt)
  deadline.setMinutes(deadline.getMinutes() - RESPONSE_DEADLINE_MINUTES[type])
  return deadline
}

/**
 * Can this player still respond (present/absent) to this convocation?
 *
 * Computes the deadline with `getResponseDeadline`, then checks whether `now`
 * is still before it. Returns `false` once the deadline has passed — the
 * response window is closed, independent of the convocation's actual
 * date/time. Also returns `false` once the convocation is no longer `open`.
 */
export function canPlayerRespond(convocation: Convocation, now: Date): boolean {
  const deadline = getResponseDeadline(convocation.type, new Date(convocation.date))
  return now < deadline && convocation.status === 'open'
}
