import { IconChevronRight, IconTrophy } from '@tabler/icons-react'

interface PendingVoteAlertProps {
  pendingVote: { convocationId: string; daysLabel: string; matchRecap: { matchLine: string | null; dateLine: string } } | null
  onOpen: (convocationId: string) => void
}

// Banner shown until the player has voted for the man of the match or the
// voting window ends — absent otherwise, same "carte absente" rule as
// MissingDocumentAlert. The whole banner is one tappable <button> (≥44px,
// CLAUDE.md §6) that opens the match's vote tab.
export function PendingVoteAlert({ pendingVote, onOpen }: PendingVoteAlertProps) {
  if (!pendingVote) return null

  return (
    <button
      type="button"
      onClick={() => onOpen(pendingVote.convocationId)}
      className="flex min-h-11 w-full items-center gap-3.5 rounded-[20px] bg-coach-red px-4.5 py-4 text-left"
    >
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">
        <IconTrophy className="size-5.5 text-white" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[10.5px] font-extrabold tracking-wider text-white/80 uppercase">{pendingVote.daysLabel}</span>
        <span className="text-[15px] font-bold text-white">Élisez l'homme du match</span>
        {pendingVote.matchRecap.matchLine && (
          <span className="text-[12.5px] font-semibold text-white/90">{pendingVote.matchRecap.matchLine}</span>
        )}
        <span className="text-[12.5px] text-white/70">{pendingVote.matchRecap.dateLine}</span>
      </span>
      <IconChevronRight aria-hidden className="size-5 shrink-0 text-white/80" />
    </button>
  )
}
