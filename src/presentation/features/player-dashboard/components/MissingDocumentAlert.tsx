import { IconAlertCircle } from '@tabler/icons-react'

interface MissingDocumentAlertProps {
  visible: boolean
  onOpen: () => void
}

// specs/player-dashboard.md UI design §2 — full-width red banner, rendered
// ONLY when the user has at least one Document in 'missing'/'rejected'
// status (AC-PD-13). Absence, not a grey/empty state, when there's nothing
// to alert on — the same "carte absente" rule used everywhere on this
// screen (§2 RBAC, moindre privilège), even though this isn't a
// permission check but a data one.
//
// The whole card is one tappable element (a <button>, not a nested
// <button>/<a> pair) at a comfortable height — the spec calls out "zone
// ≥44px" explicitly, so this mirrors CLAUDE.md §6's mobile touch-target
// rule even though it isn't a form control.
export function MissingDocumentAlert({ visible, onOpen }: MissingDocumentAlertProps) {
  if (!visible) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 w-full items-center gap-3.5 rounded-[20px] bg-coach-red px-4.5 py-4 text-left"
    >
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">
        <IconAlertCircle className="size-5.5 text-white" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[10.5px] font-extrabold tracking-wider text-white/80 uppercase">Alerte</span>
        {/* Copy stays generic on purpose — never names a document type
            (PO-PD-06, §3 "note du bandeau"): a required piece could turn
            out to be a medical certificate, and naming it here would leak
            a health-adjacent detail before that's arbitrated. Singular vs.
            plural phrasing for "several missing documents" is left as a
            TODO for whoever wires `visible` — see AC-PD-13, PO-PD-06. */}
        <span className="text-[15px] font-bold text-white">Document(s) manquant(s)</span>
      </span>
    </button>
  )
}
