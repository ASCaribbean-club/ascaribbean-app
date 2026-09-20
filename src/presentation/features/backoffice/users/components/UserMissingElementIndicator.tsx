import { IconAlertCircle } from '@tabler/icons-react'
import { hasMissingElement, type MissingElementFacts } from '@domain/policies/user-completeness'
import { Tooltip, TooltipContent, TooltipTrigger } from '@presentation/shared/components/ui/tooltip'

interface UserMissingElementIndicatorProps {
  facts: MissingElementFacts
}

// specs/web-users.md UI design, "Icône d'avertissement de ligne" (PO-WU-04
// résolu sur la forme, §7) — dit QU'IL MANQUE quelque chose, jamais COMBIEN
// (le décompte vit ailleurs, au badge de navigation, sur une unité
// différente : des comptes, pas des critères). Consomme le MÊME prédicat
// pur que CountUsersRequiringAttentionUseCase (AC-WU-17) — jamais un second
// calcul recopié ici.
const CRITERIA: { failed: (facts: MissingElementFacts) => boolean; label: string }[] = [
  { failed: (facts) => !facts.hasRole, label: 'Aucun rôle assigné' },
  { failed: (facts) => !facts.hasMembershipForCurrentSeason, label: 'Aucune adhésion pour la saison en cours' },
  // Only reported when a current-season membership DOES exist but carries
  // no licence number — reporting it whenever hasLicenceNumberForCurrentSeason
  // is false would double up with the criterion above every time there's no
  // membership at all (toMissingElementFacts() forces this field to false in
  // that case too, see that mapper's own comment).
  { failed: (facts) => facts.hasMembershipForCurrentSeason && !facts.hasLicenceNumberForCurrentSeason, label: 'Numéro de licence absent' },
  { failed: (facts) => !facts.charterAccepted, label: 'Charte non acceptée' },
]

// AC-WU-16/AC-WU-28 — rendered ONLY when hasMissingElement() is true for
// this row (never a neutral icon shown on every row); `aria-label` carries
// the full list even without a hover/focus tooltip (screen reader, no
// visible tooltip) — never the color alone.
export function UserMissingElementIndicator({ facts }: UserMissingElementIndicatorProps) {
  if (!hasMissingElement(facts)) return null

  const failedLabels = CRITERIA.filter((criterion) => criterion.failed(facts)).map((criterion) => criterion.label)
  const description = `Dossier incomplet : ${failedLabels.join(', ')}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={description}
          // size-11/min-w-11 — a real touch target even on this desktop-only
          // screen (CLAUDE.md §6 applies "y compris sur desktop", §7 of the
          // spec).
          className="flex size-11 min-w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <IconAlertCircle className="size-4.5 text-coach-amber" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>{failedLabels.join(', ')}</TooltipContent>
    </Tooltip>
  )
}
