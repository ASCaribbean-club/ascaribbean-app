import { IconCircleCheck, IconFilterOff, IconUsersGroup } from '@tabler/icons-react'
import { EmptyState } from '@presentation/shared/components/EmptyState'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { AlertsWrongRoleState } from './components/AlertsWrongRoleState'
import { CoachAlertRow } from './components/CoachAlertRow'
import { CoachAlertsTypeFilter } from './components/CoachAlertsTypeFilter'
import { useCoachAlertsViewModel } from './useCoachAlertsViewModel'

// specs/coach-alerts.md UI design "Structure de l'écran" — zero business
// logic here (CLAUDE.md §6): only the isLoading/error/canX-shaped branches
// the ViewModel already computed. `AlertsWrongRoleState` is checked FIRST,
// before isLoading/error — the ViewModel never fires a query for a
// non-coach active role (AC-AL-05), so this ordering only ever affects
// which branch renders, never which request goes out.
export function CoachAlertsPage() {
  const vm = useCoachAlertsViewModel()

  return (
    <div className="flex min-h-screen flex-col bg-coach-bg text-white">
      {/* Développeuse, 2026-09-30 — le titre porte le compte, même donnée
          que la pastille de CoachHeader (`vm.totalCount` — le total réel,
          jamais réduit par le filtre de type local à cet écran).
          "Alertes" nu tant que rien n'est encore chargé ou qu'il n'y a rien
          à traiter — jamais "Alertes (0)", même convention que la pastille
          d'en-tête. */}
      <BackHeader title={vm.totalCount > 0 ? `Alertes (${vm.totalCount})` : 'Alertes'} onBack={vm.goBack} />

      {vm.isWrongRole ? (
        <AlertsWrongRoleState />
      ) : vm.isLoading ? (
        <p className="p-5.5 text-white">Chargement…</p>
      ) : vm.error ? (
        <p role="alert" className="p-5.5 text-white">
          Une erreur est survenue.
        </p>
      ) : vm.noActiveTeam ? (
        <EmptyState icon={IconUsersGroup} message="Aucune équipe active pour le moment." />
      ) : vm.isEmpty ? (
        // AC-AL-16 — the nominal "nothing left to do" case, a SUCCESS state
        // (positive icon/copy), never the same visual register as
        // "aucune équipe" above or an error. Unaffected by the type filter
        // (vm.isEmpty reads the unfiltered backlog) — the chips never even
        // render here, filtering nothing has no purpose.
        <EmptyState icon={IconCircleCheck} message="Tout est à jour, aucune action à faire pour le moment." />
      ) : (
        <div className="flex flex-col gap-4 px-5.5 pt-4">
          <CoachAlertsTypeFilter selectedTypes={vm.selectedTypes} onToggleType={vm.onToggleType} countByType={vm.countByType} />

          {vm.isFilteredEmpty ? (
            // Distinct from vm.isEmpty above: a real backlog exists, only
            // the active type filter hides all of it — never the positive
            // "tout est à jour" copy, that would misreport the backlog.
            <EmptyState icon={IconFilterOff} message="Aucune alerte pour ce type de convocation." />
          ) : (
            <ul className="flex flex-col pb-10">
              {vm.items.map((item) => (
                <CoachAlertRow
                  key={item.convocation.id}
                  convocation={item.convocation}
                  opponent={item.opponent}
                  meetingPointTime={item.meetingPointTime}
                  attendanceConfirmationMissing={item.attendanceConfirmationMissing}
                  matchScoreMissing={item.matchScoreMissing}
                  goalAttributionMissing={item.goalAttributionMissing}
                  attributedGoalCount={item.attributedGoalCount}
                  goalsFor={item.goalsFor}
                  onOpen={vm.goToConvocationDetail}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
