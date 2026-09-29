import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { PlayerStatsCardsCard } from './components/PlayerStatsCardsCard'
import { PlayerStatsEmptyState } from './components/PlayerStatsEmptyState'
import { PlayerStatsGoalsCard } from './components/PlayerStatsGoalsCard'
import { PlayerStatsRateCard } from './components/PlayerStatsRateCard'
import { usePlayerStatsViewModel } from './usePlayerStatsViewModel'

// specs/player-stats.md UI design §1/§4 — pushed route from Menu's
// "Statistiques" card (PO-PS-01/AC-PS-15), NOT a 5th BottomNav destination:
// BackHeader, `sticky top-0`, same pattern as ProfilePage/
// ConvocationDetailPage (AC-PS-22). Title "Mes statistiques", taken
// verbatim from exports 1/2.
//
// Zero business logic (CLAUDE.md §6) — this component only branches on
// `vm.isFullyEmpty` and renders the per-card `status` values the ViewModel
// already computed; it never reads AttendanceSummary/ResponseSummary
// directly nor calls attendanceRate/responseRate itself.
//
// §4 — response card, then attendance card (in that order, never
// nested/merged, AC-PS-16), then the goals card. No "Matchs"
// card, no Excusées/Non excusées counters, no "Série en cours", no season
// selector, no competition filter chips — all explicitly out of scope
// (§7 "Corrections proposées vs maquette").
export function PlayerStatsPage() {
  const vm = usePlayerStatsViewModel()

  return (
    <div className="flex flex-col text-white">
      <BackHeader title="Mes statistiques" onBack={vm.goBack} />

      {vm.isFullyEmpty ? (
        <PlayerStatsEmptyState />
      ) : (
        <div className="flex flex-col gap-3 px-5.5 pb-8">
          <PlayerStatsRateCard
            title="Taux de réponse"
            status={vm.responseCard.status}
            percent={vm.responseCard.percent}
            numerator={vm.responseCard.numerator}
            denominator={vm.responseCard.denominator}
            denominatorNoun="convocations passées"
            unavailableMessage="Pas encore de convocation passée cette saison."
            errorMessage="Impossible de charger ton taux de réponse."
          />

          {/* AC-PS-16 — deux cartes séparées, jamais fusionnées : la carte
              présence rend son PROPRE sous-état à dénominateur nul même si
              la carte réponse ci-dessus est pleinement disponible (§4.2). */}
          <PlayerStatsRateCard
            title="Taux de présence"
            status={vm.attendanceCard.status}
            percent={vm.attendanceCard.percent}
            numerator={vm.attendanceCard.numerator}
            denominator={vm.attendanceCard.denominator}
            denominatorNoun="séances validées"
            unavailableMessage="Pas encore de séance validée par ton coach."
            errorMessage="Impossible de charger ton taux de présence."
            breakdown={vm.attendanceCard.breakdown}
          />

          {/* §4.3 — zéro but est un état normal, pas un état vide : cette
              carte reste rendue même quand les deux taux ci-dessus sont
              dans leur sous-état "dénominateur nul". */}
          <PlayerStatsGoalsCard status={vm.goalsCard.status} count={vm.goalsCard.count} errorMessage="Impossible de charger tes buts marqués." />

          {/* Addendum "PO-PS-03 tranché" — mêmes règles que la carte buts :
              jamais un état vide en soi, un carton peut exister pendant que
              les deux taux sont encore dans leur sous-état "dénominateur
              nul". */}
          <PlayerStatsCardsCard
            status={vm.cardsCard.status}
            yellowCount={vm.cardsCard.yellowCount}
            redCount={vm.cardsCard.redCount}
            errorMessage="Impossible de charger tes cartons."
          />
        </div>
      )}
    </div>
  )
}
