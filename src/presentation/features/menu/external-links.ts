import { IconBrandInstagram, IconFileText, IconFlag, IconHeartHandshake, IconMessageCircle, IconWorld } from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import type { ExternalLinkTarget } from '@presentation/shared/observability/analytics-events'

export interface MenuExternalLink {
  icon: Icon
  title: string
  subtitle: string
  url: string
  // Cible d'analytics : valeur fermée, jamais l'URL.
  target: ExternalLinkTarget
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
    target: 'club_site',
  },
  {
    icon: IconBrandInstagram,
    title: 'Instagram',
    subtitle: 'Actualités et photos du club',
    url: 'https://www.instagram.com/as_caribbean/',
    target: 'instagram',
  },
  {
    icon: IconHeartHandshake,
    title: 'Faire un don',
    subtitle: 'Soutenir le club via HelloAsso',
    url: 'https://www.helloasso.com/associations/association-sportive-caribbean/formulaires/1',
    target: 'donation',
  },
]

// specs/menu.md addendum (2026-09-04), point 3 — PO-MN-03 resolved: all
// URLs below are real and final. "Règlement du club" links to the règlement
// intérieur PDF hosted on Google Drive.
export const MENU_EXTERNAL_LINKS: MenuExternalLink[] = [
  {
    icon: IconFlag,
    title: 'Espace fédéral',
    subtitle: 'Feuille de match et licences',
    url: 'https://epreuves.fff.fr/competition/club/565351-association-sportive-caribbean/club',
    target: 'federation',
  },
  {
    icon: IconFileText,
    title: 'Règlement du club',
    subtitle: 'Règlement intérieur',
    url: 'https://drive.google.com/file/d/1jbZU6G7REiuFhanoc1lmGtf5RRkIlWij/view?usp=sharing',
    target: 'club_rules',
  },
  {
    icon: IconMessageCircle,
    title: 'Support',
    subtitle: 'Contacter le secrétariat',
    url: 'mailto:ascaribbean44@gmail.com',
    target: 'support',
  },
]
