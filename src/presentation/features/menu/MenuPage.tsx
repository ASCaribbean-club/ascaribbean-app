import { IconChartBar, IconFileText, IconTrophy } from '@tabler/icons-react'
import { DisabledMenuCard } from './components/DisabledMenuCard'
import { ExternalLinkRow } from './components/ExternalLinkRow'
import { LogoutButton } from './components/LogoutButton'
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
// per AC-MN-17, this screen renders identically for every account shape
// (no team, no season, no role) — the addendum removed the only query this
// screen used to make.
export function MenuPage() {
  const vm = useMenuViewModel()

  return (
    <div className="flex min-h-[75svh] flex-col gap-6 px-5.5 pt-[max(1.375rem,env(safe-area-inset-top))] pb-[max(1.375rem,env(safe-area-inset-bottom))] text-white">
      <h1 className="text-[26px] font-extrabold text-white pt-6">Menu</h1>


      {/* "SUIVI DE L'ÉQUIPE" — Statistiques/Classement: no CDC-grounded
          module behind either card (specs/menu.md Écarts, PO-MN-04).
          Rendered disabled rather than absent per the addendum, point 2.
          "Classement" subtitle is neutral, not the mockup's fabricated
          "4e · 11 pts · J6" — a greyed card is still a card, and a fake
          ranking value would mislead even greyed out. */}
      <section className="flex flex-col gap-2.5">
        <MenuSectionTitle>Suivi de l'équipe</MenuSectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <DisabledMenuCard icon={IconChartBar} title="Statistiques" subtitle="Présence, buts, forme" />
          <DisabledMenuCard icon={IconTrophy} title="Classement" subtitle="Bientôt disponible" />
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

      <VersionFooter version={vm.appVersion} className="mt-auto pb-2" />
    </div>
  )
}
