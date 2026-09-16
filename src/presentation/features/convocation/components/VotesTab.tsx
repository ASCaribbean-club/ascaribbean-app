import { VoteCategoryCard, type VoteCategoryBody } from './VoteCategoryCard'
import { VotePrivacyNotice } from './VotePrivacyNotice'
import type { ReactNode } from 'react'

export interface VoteCategoryViewModel {
  id: string
  icon: ReactNode
  label: string
  subtitle?: string
  statusBadge?: ReactNode
  body: VoteCategoryBody
}

interface VotesTabProps {
  // UI design §"Catégorie positive seule en v1" — AC-PV-16/PO-PV-02: this
  // array holds exactly one entry (the positive category) — the negative
  // one is REJECTED (decided 2026-09-16, final), not merely deferred.
  // Rendering is a plain `.map`, not a hardcoded "first card / second card"
  // layout, which is simply the natural shape for one category — it isn't
  // there to anticipate a second one coming back.
  categories: VoteCategoryViewModel[]
  // "Clôture des votes 48h après le match" / "Votes fermés 48h après le
  // match" on the mockups — PO-PV-06 leaves the exact window undecided, so
  // this stays an optional caller-provided string rather than a computed
  // countdown built here.
  closureNoticeText?: string
}

// Third tab of ConvocationDetailPage (specs/player-vote.md UI design,
// "Barre d'onglets à trois entrées") — this component itself carries NO
// role branching: ConvocationDetailPage/its ViewModel decide, per category,
// whether `body.kind` is 'ballot' (player, hasn't voted) or 'results'
// (everyone else, or a player who has voted) before handing it to
// VoteCategoryCard. Keeping the role decision out of this file is
// deliberate — same "un composant ne calcule rien" rule as every other
// screen (ARCHITECTURE.md §6).
export function VotesTab({ categories, closureNoticeText }: VotesTabProps) {
  return (
    <div className="flex flex-col gap-4 px-5.5 pt-4 pb-8">
      <VotePrivacyNotice />

      {categories.map((category) => (
        <VoteCategoryCard
          key={category.id}
          icon={category.icon}
          label={category.label}
          subtitle={category.subtitle}
          statusBadge={category.statusBadge}
          body={category.body}
        />
      ))}

      {closureNoticeText && <p className="pt-1 text-center text-[11.5px] text-white/35">{closureNoticeText}</p>}
    </div>
  )
}
