import type { Document } from '@domain/entities/document'
import { DocumentStatusBadge } from './DocumentStatusBadge'

interface DocumentRowProps {
  document: Pick<Document, 'type' | 'status'>
}

// UI design §"Bloc documents" — a variation of the list-line pattern
// already used for the Effectif roster (RosterRow: label left, status
// indicator right) but without an avatar, a document has no identity of
// its own to show. `type` is rendered VERBATIM (spec §3 — it's a free-text
// column, no label mapping exists or should be invented here: "aucun
// mapping de libellé n'existe ni n'est à inventer ici").
export function DocumentRow({ document }: DocumentRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
      <span className="min-w-0 truncate text-[13.5px] font-semibold text-white">{document.type}</span>
      <DocumentStatusBadge status={document.status} />
    </li>
  )
}
