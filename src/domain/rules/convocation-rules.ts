// Règles dérivées de l'état d'une Convocation / d'un jeu de ConvocationResponse :
// "qu'est-ce qui est vrai", jamais "qui a le droit" (ça reste dans domain/policies/).

import type { Convocation, ConvocationResponse } from '../entities/convocation'

export interface ResponseCounts {
  present: number
  absent: number
  pending: number
}

export function isUpcoming(convocation: Convocation, now: Date): boolean {
  return convocation.status === 'open' && new Date(convocation.date) > now
}

export function isPastDate(date: string, now: Date): boolean {
  return new Date(date) < now
}

// Soonest-first comparator for `Array.prototype.sort` — "next" (the nearest
// upcoming convocation) and "à venir" (chronological list) both depend on
// this order, so it's a rule, not an incidental repository/query detail
// (ListUpcomingTeamConvocationsUseCase can't assume listForTeam's own
// ordering).
export function byDateAscending(a: Convocation, b: Convocation): number {
  return new Date(a.date).getTime() - new Date(b.date).getTime()
}

// Counts from ConvocationResponse only (AC-CD-04 — never AttendanceRecord,
// CLAUDE.md §6). Known gap against AC-CD-05 (présents + absents + en
// attente = nombre de convoqués): a convoked player who hasn't responded
// has no ConvocationResponse row at all, so they're absent from this count
// entirely rather than counted as pending — same shape of problem
// isConvocationComplete() (../policies/convocation-closure.ts) solved for
// AttendanceRecord by taking `requiredUserIds: string[]`. Deferred until
// roster access for a coach is settled (specs/coach-dashboard.md PO-6b,
// still open) — no repository exposes a team roster today, only
// TeamRepository.countActiveMembers (an aggregate).
export function summarizeResponses(responses: ConvocationResponse[]): ResponseCounts {
  const counts = responses.reduce<ResponseCounts>(

    (counts, response) => {
      counts[response.status]++
      return counts
    },
    { present: 0, absent: 0, pending: 0 }
  )

  return counts

}
