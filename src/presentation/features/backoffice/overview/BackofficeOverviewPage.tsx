import { IconCreditCard, IconNews, IconShirtSport, IconUserPlus } from '@tabler/icons-react'
import { BackofficePageHeader } from '@presentation/features/backoffice/components/BackofficePageHeader'
import { MembershipFormDialog } from '@presentation/features/backoffice/memberships/components/MembershipFormDialog'
import { RecordPaymentDialog } from '@presentation/features/backoffice/memberships/components/RecordPaymentDialog'
import { NewsFormDialog } from '@presentation/features/backoffice/news/components/NewsFormDialog'
import { TeamFormDialog } from '@presentation/features/backoffice/teams/components/TeamFormDialog'
import { InviteUserDialog } from '@presentation/features/backoffice/users/components/InviteUserDialog'
import { DashboardActionCard } from './components/DashboardActionCard'
import { DashboardStatCard } from './components/DashboardStatCard'
import { PendingInvitationsPanel } from './components/PendingInvitationsPanel'
import { UnpaidDuesPanel } from './components/UnpaidDuesPanel'
import { useBackofficeOverviewViewModel } from './useBackofficeOverviewViewModel'

// specs/web-dashboard.md — replaces the BackofficeEmptyState stub, same
// gesture as web-actus/web-seasons/section-and-teams/web-memberships/
// web-users before it (§1, "cette tranche remplace le BackofficeEmptyState
// rendu par BackofficeOverviewPage"). Zero business logic here (AC-WD-04):
// every branch below reads a boolean/string the ViewModel already computed.
// The four "réutiliser les dialogues" (AC-WD-09) are mounted here, exactly
// like BackofficeUsersPage/BackofficeTeamsPage mount their own — none of the
// four dialogs or their ViewModels are touched by this feature.
export function BackofficeOverviewPage() {
  const vm = useBackofficeOverviewViewModel()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <BackofficePageHeader firstName={vm.firstName} contextLine={vm.contextLine} />

      {/* §2.3/UI design §2 — a tile disappears (never renders disabled) when
          its own permission is false; the three others redistribute rather
          than leaving a gap (AC-WD-11). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {vm.canInviteUser && (
          <DashboardActionCard
            icon={IconUserPlus}
            title="Inviter un utilisateur"
            description="Lien à partager"
            variant="primary"
            onClick={vm.openInviteDialog}
          />
        )}
        {vm.canWriteTeam && (
          <DashboardActionCard icon={IconShirtSport} title="Créer une équipe" description="Section, saison" onClick={vm.openCreateTeamDialog} />
        )}
        {vm.canWriteMembership && (
          <DashboardActionCard
            icon={IconCreditCard}
            title="Créer une adhésion"
            description="Nouvelle adhésion"
            onClick={vm.openMembershipDialog}
          />
        )}
        {vm.canWriteNews && (
          <DashboardActionCard icon={IconNews} title="Publier une actu" description="Visible par le club" onClick={vm.openCreateNewsDialog} />
        )}
      </div>

      {/* §2.1/§2.2 — 4 links to their own tab, destinations resolved from
          BACKOFFICE_NAV_ITEMS by the ViewModel (AC-WD-08), each degrading
          independently (AC-WD-28). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {vm.statCards.map((card) => (
          <DashboardStatCard key={card.id} card={card} />
        ))}
      </div>

      {/* §2.4 — the two work panels, side by side, min-w-0 on each column
          (CLAUDE.md §6). */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UnpaidDuesPanel data={vm.unpaidDues} canRecordPayment={vm.canRecordPayment} onRecordPayment={vm.openPaymentDialog} />
        <PendingInvitationsPanel data={vm.pendingInvitations} />
      </div>

      <InviteUserDialog target={vm.inviteDialogTarget} onClose={vm.closeInviteDialog} />
      <TeamFormDialog dialog={vm.teamDialog} onClose={vm.closeTeamDialog} />
      <MembershipFormDialog isOpen={vm.isMembershipDialogOpen} onClose={vm.closeMembershipDialog} />
      <NewsFormDialog dialog={vm.newsDialog} onClose={vm.closeNewsDialog} />
      <RecordPaymentDialog target={vm.paymentTarget} onClose={vm.closePaymentDialog} />
    </div>
  )
}
