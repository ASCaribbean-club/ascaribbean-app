import type { Role } from '@domain/entities/user'

export interface RoleScopeBlockProps {
  role: Role
  scopeLines: string[]
  // specs/profile-page.md §7 addendum (2026-09-04) — "who coaches my team",
  // resolved by GetProfileRoleScopesUseCase for the player role only; every
  // other role gets an empty array from useProfileViewModel, so this prop
  // is safe to accept unconditionally rather than gated per-role here too.
  coachNames?: string[]
  // Developer follow-up on the same addendum — the player's own team
  // section(s) and current season. Also player-only in practice (empty
  // array / null for every other role, same reasoning as coachNames above).
  sectionNames?: string[]
  seasonLabel?: string | null
}

// UI design §"Composants réutilisés vs nouveaux" — ONE render for a
// single role's scope, reused by both the flat variant's standalone
// RoleCard and the tabbed variant's TabsContent (RoleTabs) — so the
// "which scope line for which role" mapping (AC-PR-06) is written exactly
// once, never duplicated between two implementations of the same block.
// Position no longer renders here (moved to ProfileIdentityHeader as a
// pill, per v4 of docs/designs/profile-page/) — this component is scope
// only now.
//
// v4 renders a role's scope two different ways depending on the role, not
// just on how many lines there are: player/section-manager (at most one
// scope line, by construction of RoleAssignment) get a single labelled row
// inside a bordered box, same visual language as the ADHÉSION-style rows
// elsewhere in the mockup; coach (potentially several teamIds) gets a
// horizontal wrap of chips instead — no bordered box, no row label per
// chip. `style` is keyed by role rather than by scopeLines.length so the
// choice stays stable even for the edge case of a coach with a single team.
const SCOPE_CONFIG: Partial<Record<Role, { heading: string; rowLabel: string; style: 'row' | 'chips' }>> = {
  player: { heading: 'Mon équipe', rowLabel: 'Équipe', style: 'row' },
  coach: { heading: 'Équipes encadrées', rowLabel: 'Équipe', style: 'chips' },
  'section-manager': { heading: 'Section', rowLabel: 'Section', style: 'row' },
  // The 5 club-wide roles (authorized-officer, treasurer, medical-referent,
  // volunteer, admin) are deliberately absent from this map — AC-PR-06
  // forbids rendering any scope line for them, not even an empty/dash one.
}

export function RoleScopeBlock({ role, scopeLines, coachNames = [], sectionNames = [], seasonLabel = null }: RoleScopeBlockProps) {
  const config = SCOPE_CONFIG[role]

  // Extra rows appended after the team row(s) inside the same bordered box
  // — section/season are still facts about the player's OWN team, coach is
  // the one third-party fact (AC-01/AC-02 exception), kept last so the
  // "my scope" facts read together before the "someone else" one.
  const extraRows = [
    ...sectionNames.map((name) => ({ key: `section-${name}`, label: 'Section', value: name })),
    ...(seasonLabel ? [{ key: 'season', label: 'Saison', value: seasonLabel }] : []),
    ...coachNames.map((name) => ({ key: `coach-${name}`, label: 'Coach', value: name })),
  ]

  // AC-PR-06 — this whole block is omitted (not an empty/dash row) when
  // there's no config for this role (club-wide) OR there is genuinely
  // nothing to show for it: scopeLines AND extraRows both empty (e.g. all of
  // a coach's teams from a past season — §1, PO-PR-07). Checking extraRows
  // too matters for the player role, whose coach/section/season facts are
  // resolved independently of scopeLines — a stale/unresolvable team must
  // not also hide those already-resolved facts.
  if (!config || (scopeLines.length === 0 && extraRows.length === 0)) {
    return null
  }

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">{config.heading}</p>

      {config.style === 'chips' ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {scopeLines.map((line) => (
            <li
              key={line}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[13.5px] font-semibold text-white"
            >
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-coach-green" />
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-2 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {scopeLines.map((line, index) => (
            <li
              key={line}
              className={`flex items-center justify-between px-4 py-3.5 ${index > 0 ? 'border-t border-white/10' : ''}`}
            >
              <span className="text-[13.5px] text-white/50">{config.rowLabel}</span>
              <span className="text-[14px] font-bold text-white">{line}</span>
            </li>
          ))}
          {/* Section/season/coach rows — player only in practice (all three
              props are empty/null for every other role, see prop comments
              above). Continues the same bordered box rather than a separate
              block: they're still facts about "my team", not a new section. */}
          {extraRows.map((row) => (
            <li key={row.key} className="flex items-center justify-between border-t border-white/10 px-4 py-3.5">
              <span className="text-[13.5px] text-white/50">{row.label}</span>
              <span className="text-[14px] font-bold text-white">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
