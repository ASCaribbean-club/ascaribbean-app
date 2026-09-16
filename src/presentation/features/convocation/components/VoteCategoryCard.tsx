import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '@presentation/shared/components/ui/card'
import { Button } from '@presentation/shared/components/ui/button'
import { RadioGroup } from '@presentation/shared/components/ui/radio-group'
import { VoteCandidateRow } from './VoteCandidateRow'
import { VoteEmptyState } from './VoteEmptyState'

export interface VoteCandidate {
  id: string
  name: string
}

export interface VoteResultCandidate extends VoteCandidate {
  // Already the display-ready number (0-100 for a percentage, a plain
  // integer for an absolute count) — the ViewModel/use case decides the
  // unit (coach vs player, AC-PV-10's own "deux unités de restitution")
  // before this component ever sees it; VoteCategoryCard never converts
  // between the two itself.
  value: number
}

// One discriminated body shape per state row in the UI design's "États à
// couvrir" table, minus the two states that are full-screen replacements
// for the whole tab rather than a single card (RoleMismatchState) or that
// live one level up (the privacy banner, shared across every category —
// see VotesTab).
export type VoteCategoryBody =
  | {
      // AC-PV-13 — a real category with literally zero votes recorded.
      kind: 'empty'
      emptyMessage: string
    }
  | {
      // Player, before submitting. AC-PV-16 — the only category this pass
      // ever wires up is the positive one; nothing here assumes a second
      // category exists.
      kind: 'ballot'
      candidates: VoteCandidate[]
      selectedCandidateId: string | null
      onSelectCandidate: (candidateId: string) => void
      onSubmit: () => void
      // AC-PV-19 button stays a real ~44px target even disabled — shadcn's
      // own disabled styling (opacity) is enough here, no separate
      // treatment needed.
      isSubmitting: boolean
      // UI design "État d'écriture... échouée" — inline, under the list,
      // selection preserved, button re-enabled. `null` when there's no
      // error to show.
      submitErrorMessage: string | null
    }
  | {
      // Results, either still-open (player, with "changer mon vote") or
      // closed/coach (no edit affordance at all — `onChangeVote` absent).
      kind: 'results'
      unit: 'percentage' | 'absolute'
      candidates: VoteResultCandidate[]
      // Player-only — a coach never has a vote of their own (UI design,
      // "le coach n'a pas de vote personnel").
      myCandidateId?: string | null
      // "11 votes sur 14 joueuses · aucun nom associé" — PO-PV-10a/c leave
      // the denominator's SOURCE open; this component just renders whatever
      // string the caller already resolved, it doesn't compute one.
      voteCountLabel?: string
      // Present only while the window is still open AND the viewer already
      // voted (UI design: "lien... tant que les votes ne sont pas clos") —
      // absent covers both "votes closed" (AC-PV-12) and "coach viewing" in
      // one prop, rather than two separate booleans that could disagree.
      onChangeVote?: () => void
    }

interface VoteCategoryCardProps {
  icon: ReactNode
  label: string
  subtitle?: string
  // Pre-built element, same convention as RosterRow's own `badge: ReactNode`
  // prop — "Résultats masqués" / "Vote enregistré" / nothing at all,
  // resolved by the caller rather than re-derived here from other props.
  statusBadge?: ReactNode
  body: VoteCategoryBody
}

// UI design §"Nouveau composant — VoteCategoryCard": one `Card` per
// category. The negative category (PO-PV-02) is REJECTED, decided
// 2026-09-16, final — this component has no branch anywhere that assumes a
// second one exists, and none should be added without a new product
// decision (AC-PV-16).
export function VoteCategoryCard({ icon, label, subtitle, statusBadge, body }: VoteCategoryCardProps) {
  const maxValue = body.kind === 'results' ? Math.max(1, ...body.candidates.map((c) => c.value)) : 1
  // See the results branch below for what this distinguishes and why.
  const isCoachView = body.kind === 'results' && body.myCandidateId === undefined

  return (
    <Card className="border border-white/10 bg-white/[0.03] py-4 text-white ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-white/70">
            {icon}
            <span className="text-[12px] font-extrabold tracking-[0.04em] uppercase">{label}</span>
          </div>
          {subtitle && <p className="text-[11.5px] text-white/45">{subtitle}</p>}
        </div>
        {statusBadge}
      </CardHeader>

      <CardContent className="flex flex-col gap-2.5 px-4">
        {body.kind === 'empty' && <VoteEmptyState message={body.emptyMessage} />}

        {body.kind === 'ballot' && (
          <>
            <RadioGroup
              value={body.selectedCandidateId}
              onValueChange={body.onSelectCandidate}
              disabled={body.isSubmitting}
              className="flex flex-col gap-2.5"
            >
              {body.candidates.map((candidate) => (
                <VoteCandidateRow
                  key={candidate.id}
                  mode="ballot"
                  candidateId={candidate.id}
                  name={candidate.name}
                  selected={body.selectedCandidateId === candidate.id}
                />
              ))}
            </RadioGroup>

            {body.submitErrorMessage && <p className="text-[12px] font-semibold text-coach-red-text">{body.submitErrorMessage}</p>}

            {/* AC-PV-19 — h-11 (~44px), not shadcn's own h-8 default, same
                override BackHeader/AttendanceConfirmRow already apply
                elsewhere on this screen. Disabled (not hidden) while no
                candidate is picked yet OR a submission is in flight — the
                UI design's own helper text below explains why, rather than
                the button silently doing nothing. */}
            <Button
              type="button"
              onClick={body.onSubmit}
              disabled={!body.selectedCandidateId || body.isSubmitting}
              className="h-11 w-full rounded-full bg-coach-green text-white hover:bg-coach-green/90"
            >
              {body.isSubmitting ? 'Enregistrement…' : 'Valider mon vote'}
            </Button>
            {!body.selectedCandidateId && !body.isSubmitting && (
              <p className="text-center text-[11.5px] text-white/40">Choisis un joueur pour voter</p>
            )}
          </>
        )}

        {body.kind === 'results' && (
          <>
            {/* UI design "Coach vs joueuse: deux unités de restitution
                différentes" — `myCandidateId === undefined` (the prop
                simply omitted by the caller) is how a coach-view card is
                told apart from a player-view one that just hasn't voted yet
                (`null`, still a DEFINED value): a coach genuinely has no
                vote of their own, so EVERY bar renders in the accent colour
                (mockup 1) rather than none of them. */}
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {body.candidates.map((candidate) => {
                const isMyChoice = !isCoachView && body.myCandidateId === candidate.id
                return (
                  <VoteCandidateRow
                    key={candidate.id}
                    mode="result"
                    candidateId={candidate.id}
                    name={candidate.name}
                    unit={body.unit}
                    value={candidate.value}
                    fillPercentage={(candidate.value / maxValue) * 100}
                    isMyChoice={isMyChoice}
                    emphasizeBar={isCoachView || isMyChoice}
                  />
                )
              })}
            </ul>

            {(body.voteCountLabel || body.onChangeVote) && (
              <div className="flex items-center justify-between gap-3 pt-1">
                {body.voteCountLabel && <p className="text-[11.5px] text-white/45">{body.voteCountLabel}</p>}
                {body.onChangeVote && (
                  <button
                    type="button"
                    onClick={body.onChangeVote}
                    className="ml-auto text-[12px] font-bold text-coach-green-link underline-offset-2 hover:underline"
                  >
                    Changer mon vote
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
