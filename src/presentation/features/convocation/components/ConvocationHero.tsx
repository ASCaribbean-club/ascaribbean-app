import { createElement } from 'react'
import type { Convocation } from '@domain/entities/convocation'
import type { MeetingDetails } from '@domain/entities/meeting-details'
import type { Opponent } from '@domain/entities/opponent'
import { formatConvocationType, getConvocationTypeIcon } from '@presentation/shared/formatters/convocation-labels'
import { InitialsAvatar } from './InitialsAvatar'
import { StatusBadge } from './StatusBadge'
import { TeamCrestAvatar } from './TeamCrestAvatar'

interface ConvocationHeroProps {
  convocation: Convocation
  teamName: string | undefined
  opponent: Opponent | null
  meetingDetails: MeetingDetails | null
}

// The "hero" zone below BackHeader (UI design §"Structure de l'écran",
// point 2) — sits in normal scroll flow, NOT sticky (only BackHeader is,
// AC-MD-20 doesn't ask for more). Two visibly different layouts depending
// on whether there's an opponent to face off against:
//   - match: two avatars either side of "VS" (docs/designs/player-match-details/
//     .../selection_1.png) — TeamCrestAvatar for "us" (no real crest data,
//     see that component), InitialsAvatar(opponent.name) for them.
//   - training/meeting: no face-off, just an icon + title, matching the
//     pattern NextConvocationCard already uses for the same two types.
// The status pastille (top-right in the mockup) and the cancellation reason
// line are common to all three types — rendered once, outside the
// match/non-match branch.
export function ConvocationHero({ convocation, teamName, opponent, meetingDetails }: ConvocationHeroProps) {
  const Icon = getConvocationTypeIcon(convocation.type)

  const title =
    convocation.type === 'meeting' && meetingDetails ? meetingDetails.title : formatConvocationType(convocation.type)

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-1 pb-5">
      <div className="flex items-start justify-between">
        {/* Match/entraînement/réunion : le TITRE de l'en-tête reste toujours
            "Match"/"Entraînement"/"Réunion" (BackHeader) — cette ligne-ci
            n'est qu'un espace réservé pour aligner la pastille de statut à
            droite quand le hero n'a pas de face-à-face (cf. training/meeting
            ci-dessous, qui n'a pas de première ligne de titre à afficher deux
            fois). */}
        <span />
        <StatusBadge status={convocation.status} />
      </div>

      {convocation.type === 'match' ? (
        <div className="flex items-center justify-center gap-5">
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <TeamCrestAvatar />
            <p className="text-[12.5px] leading-tight font-bold text-white">{teamName}</p>
          </div>

          <span className="text-[13px] font-bold text-white/50">VS</span>

          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <InitialsAvatar name={opponent?.name ?? '?'} />
            <p className="text-[12.5px] leading-tight font-bold text-white">{opponent?.name}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2.5 py-2 text-center">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/8">
            {/* createElement, not JSX: Icon is a value looked up at render time
                (always a stable reference from CONVOCATION_TYPE_ICONS, but the
                react-hooks/static-components rule can't see that through the
                map lookup and flags a JSX tag bound to a local variable). */}
            {createElement(Icon, { className: 'size-6 text-white/70', 'aria-hidden': true })}
          </span>
          <p className="text-[19px] leading-tight font-extrabold text-white">{title}</p>
        </div>
      )}

      {/* specs/match_details_page.md §1 point 2 — cancellationReason is
          EVENT data (why the convocation itself was cancelled), never
          confused with ConvocationResponse.reason (an individual's absence
          motive, never shown anywhere on this screen, AC-MD-12). Only
          rendered for a cancelled convocation with a non-empty reason. */}
      {convocation.status === 'cancelled' && convocation.cancellationReason && (
        <p className="text-center text-[12.5px] font-semibold text-coach-red-text">
          Motif : {convocation.cancellationReason}
        </p>
      )}
    </div>
  )
}
