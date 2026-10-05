import { IconCoins, IconChartBar, IconFileText, IconTrophy, IconUsers } from '@tabler/icons-react'
import { ChangelogDialog } from './components/ChangelogDialog'
import { DisabledMenuCard } from './components/DisabledMenuCard'
import { ExternalLinkRow } from './components/ExternalLinkRow'
import { LogoutButton } from './components/LogoutButton'
import { MenuNavCard } from './components/MenuNavCard'
import { MenuSectionTitle } from './components/MenuSectionTitle'
import { VersionFooter } from './components/VersionFooter'
import { CLUB_ADMINISTRATION_LINKS, MENU_EXTERNAL_LINKS } from './external-links'
import { useMenuViewModel } from './useMenuViewModel'

// specs/menu.md UI design + addendum (2026-09-04) — title, three sections
// (Suivi de l'équipe / Club & administration / Services externes), logout
// button, version line, in that order. No "Documents" card/route: dropped
// entirely by the addendum (point 1), not just deprioritized. No
// BackHeader (the Menu is a primary nav destination, same status as
// Dashboard/Calendrier/Actus inside AppShell, not a pushed route — spec §1
// point 1).
//
// No `isLoading`/`error` branch here unlike ProfilePage/ConvocationDetailPage:
// per AC-MN-17, this screen makes no query of its own — the addendum removed
// the only one it used to make. It does read the dashboard's active role
// (already resolved synchronously by ActiveRoleProvider) to branch the
// "Statistiques" card's destination — see useMenuViewModel.ts.
export function MenuPage() {
  const vm = useMenuViewModel()

  return (
    <div className="flex min-h-[75svh] flex-col gap-6 px-5.5 pt-[max(1.375rem,env(safe-area-inset-top))] pb-[max(1.375rem,env(safe-area-inset-bottom))] text-white">
      <h1 className="text-[26px] font-extrabold text-white pt-6">Menu</h1>


      {/* "SUIVI DE L'ÉQUIPE" — specs/player-stats.md §1/PO-PS-01 (tranché
          2026-09-28): "Statistiques" is now a real nav card — subtitle
          "Présence, buts", NOT the mockup's "Présence, buts, forme" ("forme"
          has no fondement construit, AC-PS-09). specs/coach-team-stats.md
          PO-CTS-06: its destination now branches on the active dashboard
          role (vm.statisticsHref) rather than pointing at the player screen
          for everyone — a coach lands on /team-stats, not /stats.
          "Classement" is now a real nav card too (specs/mobile-leaderboard.md
          AC-LB-01, developer request resolves PO-MN-04 for this card): an
          in-team ranking, not the championship standing. Neutral subtitle,
          never the mockup's fabricated "4e · 11 pts · J6" (AC-MN-04). */}
      <section className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-3">
          {vm.canViewStatistics && (
            <MenuNavCard icon={IconChartBar} title="Statistiques" subtitle="Présence, buts" to={vm.statisticsHref} />
          )}
          <MenuNavCard icon={IconTrophy} title="Classement" subtitle="Buts, cartons" to="/leaderboard" />
          {/* specs/player-unavailability.md UI design §1 — the card disappears
              (never greyed out) when can('availability:read-team') is false. */}
          {vm.canReadTeamAvailability && (
            <MenuNavCard icon={IconUsers} title="Disponibilités" subtitle="Effectif de l'équipe" to="/availability" />
          )}
          {/* specs/mobile-treasurer.md — read-only Cotisations, only with
              can('dues:read') (treasurer / authorized-officer). */}
          {vm.canViewDues && <MenuNavCard icon={IconCoins} title="Cotisations" subtitle="Suivi des paiements" to="/dues" />}
        </div>
      </section>

      {/* "CLUB & ADMINISTRATION" — club site, Instagram, HelloAsso
          (donation hand-off, no in-app payment flow), addendum point 4.
          Real URLs, not placeholders — see ./external-links.ts. */}
      <section className="flex flex-col gap-2.5">
        <MenuSectionTitle>Club & administration</MenuSectionTitle>
        <div className="flex flex-col gap-3">
          {CLUB_ADMINISTRATION_LINKS.map((link) => (
            <ExternalLinkRow key={link.title} link={link} />
          ))}
        </div>
      </section>

      {/* "SERVICES EXTERNES" — addendum point 3: espace fédéral/support
          rendered with real URLs (./external-links.ts). "Règlement du
          club" has no destination yet (no club-wide document storage
          exists) — rendered as a disabled card rather than a dead link
          (AC-MN-02). */}
      <section className="flex flex-col gap-2.5">
        <MenuSectionTitle>Services externes</MenuSectionTitle>
        <div className="flex flex-col gap-3">
          {MENU_EXTERNAL_LINKS.map((link) => (
            <ExternalLinkRow key={link.title} link={link} />
          ))}
          <DisabledMenuCard icon={IconFileText} title="Règlement du club" subtitle="Document du club" layout="row" />
        </div>
      </section>

      <LogoutButton onLogout={vm.onLogout} />

      <VersionFooter version={vm.appVersion} onVersionTap={vm.onVersionTap} className="mt-auto pb-2" />
      <ChangelogDialog open={vm.isChangelogOpen} onOpenChange={vm.setIsChangelogOpen} />
    </div>
  )
}
