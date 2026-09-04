import { IconCircleCheck, IconCircleDashed } from '@tabler/icons-react'

// NOT currently rendered by ProfilePage.tsx — developer feedback 2026-09-04:
// the actual profile-page mockups (docs/designs/DESIGN_LINKS.md §2) carry no
// charter section. Kept here rather than deleted because specs/profile-page.md
// §1 point 4 and AC-PR-15 still describe this as in scope; this is a flagged
// spec/mockup discrepancy, not a resolved one — see ProfilePage.tsx's own note.
interface CharterStatusRowProps {
  accepted: boolean
}

// UI design §"Bloc charte" — a single row, label + a TEXTUAL state, never
// color/icon alone (AC-PR-15, AC-PR-17: "toute information portée par la
// couleur... est doublée d'un libellé textuel"). Deliberately does NOT
// reuse the coach-green/coach-red vocabulary already reserved for
// présent/absent elsewhere in the app (spec §6 reminder, same precaution as
// specs/match_details_page.md correction #9) — a neutral icon + text
// pairing instead of a colored badge.
//
// In practice this screen sits behind RequireCharterAccepted (router.tsx),
// so `accepted` is always true today — the component still renders from
// the real boolean rather than hardcoding "acceptée", because nothing in
// the spec guarantees this screen stays behind that guard forever (spec's
// own "Remarque de cadrage", not a decision to make here).
export function CharterStatusRow({ accepted }: CharterStatusRowProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
      <span className="text-[13.5px] font-semibold text-white">Charte du club</span>
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/70">
        {accepted ? <IconCircleCheck className="size-4" aria-hidden /> : <IconCircleDashed className="size-4" aria-hidden />}
        {accepted ? 'Acceptée' : 'Non acceptée'}
      </span>
      {/* TODO: PO-PR-04 (specs/profile-page.md §5) — if the developer
          confirms the acceptance DATE should also show, it's an additional
          line under this row, not a restructuring of it (spec: "le
          composant reste construit pour accueillir une ligne de date
          supplémentaire sans restructuration"). Not built yet — the point
          is still open. */}
    </div>
  )
}
