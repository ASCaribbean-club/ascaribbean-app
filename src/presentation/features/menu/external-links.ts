import { IconBrandInstagram, IconFlag, IconHeartHandshake, IconMessageCircle, IconWorld } from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'

export interface MenuExternalLink {
  icon: Icon
  title: string
  subtitle: string
  url: string
}

// specs/menu.md addendum (2026-09-04), point 4 — "Club & administration"
// added outside the CDC: club site, Instagram, HelloAsso donation hand-off
// (no in-app payment flow). All three URLs are real and final, not
// placeholders — nothing here is pending PO-MN-03.
export const CLUB_ADMINISTRATION_LINKS: MenuExternalLink[] = [
  {
    icon: IconWorld,
    title: 'Site du club',
    subtitle: 'Le site officiel du club',
    url: 'https://asc.stannick.fr/',
  },
  {
    icon: IconBrandInstagram,
    title: 'Instagram',
    subtitle: 'Actualités et photos du club',
    url: 'https://www.instagram.com/as_caribbean/',
  },
  {
    icon: IconHeartHandshake,
    title: 'Faire un don',
    subtitle: 'Soutenir le club via HelloAsso',
    url: 'https://www.helloasso.com/associations/association-sportive-caribbean/formulaires/1',
  },
]

// specs/menu.md addendum (2026-09-04), point 3 — PO-MN-03 resolved for (a)
// and (c): both URLs below are real and final. "Règlement du club" (b) is
// NOT in this list — no club-wide document storage exists yet, so it
// renders as a DisabledMenuCard in MenuPage.tsx instead of a dead `<a>`
// (specs/menu.md AC-MN-02 forbids a card that looks tappable but leads
// nowhere).
export const MENU_EXTERNAL_LINKS: MenuExternalLink[] = [
  {
    icon: IconFlag,
    title: 'Espace fédéral',
    subtitle: 'Feuille de match et licences',
    url: 'https://epreuves.fff.fr/competition/club/565351-association-sportive-caribbean/club',
  },
  {
    icon: IconMessageCircle,
    title: 'Support',
    subtitle: 'Contacter le secrétariat',
    url: 'mailto:ascaribbean44@gmail.com',
  },
]
