import { IconCheck, IconQuestionMark, IconX } from '@tabler/icons-react'
import type { ResponseCounts } from '@domain/rules/convocation-rules'

interface ResponseCountsRecapProps {
  counts: ResponseCounts
}

// Développeuse, 2026-09-30 — coach-only, PAST échéances only: a denser
// stand-in for ResponseBar (segmented bar + "N présents/absents/en
// attente" legend), which stays the right shape for an UPCOMING échéance
// where the live distribution matters. Same underlying ConvocationResponse
// counts as ResponseBar — AC-CA-03 unaffected, no AttendanceRecord read
// here. Each icon is doubled by its count via `aria-label` (AC-CA-17):
// color/icon alone never carries the meaning for assistive tech, even
// though the visible label here is a number rather than a word.
export function ResponseCountsRecap({ counts }: ResponseCountsRecapProps) {
  return (
    <ul className="m-0 flex list-none gap-3.5 p-0 text-[11.5px] font-bold">
      <li className="flex items-center gap-1 text-coach-green-text" aria-label={`${counts.present} présents`}>
        <IconCheck className="size-4" aria-hidden />
        {counts.present}
      </li>
      <li className="flex items-center gap-1 text-coach-red-text" aria-label={`${counts.absent} absents`}>
        <IconX className="size-4" aria-hidden />
        {counts.absent}
      </li>
      <li className="flex items-center gap-1 text-white/50" aria-label={`${counts.pending} en attente`}>
        <IconQuestionMark className="size-4" aria-hidden />
        {counts.pending}
      </li>
    </ul>
  )
}
