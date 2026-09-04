import type { Document } from '@domain/entities/document'
import { DocumentRow } from './DocumentRow'

// NOT currently rendered by ProfilePage.tsx — developer feedback 2026-09-04:
// the actual profile-page mockups (docs/designs/DESIGN_LINKS.md §2) carry no
// documents section. Kept here rather than deleted because specs/profile-page.md
// §1 point 5 and AC-PR-14 still describe this as in scope; this is a flagged
// spec/mockup discrepancy, not a resolved one — see ProfilePage.tsx's own note.
// DocumentRow.tsx/DocumentStatusBadge.tsx below are unused for the same reason.
interface DocumentsSectionProps {
  documents: Pick<Document, 'type' | 'status'>[]
  loading: boolean
  hasDocuments: boolean
}

// UI design §"Bloc documents" — always rendered, unlike the role block
// (which can disappear entirely for a 0-role account, AC-PR-08): "Mes
// documents" is expected content for every account, so only its CONTENT
// branches on loading/empty/populated — the section header itself is
// never conditional (AC-PR-14, "la présence du bloc documents lui-même
// n'est jamais conditionnelle, seul son contenu peut être vide").
// `hasDocuments`/`loading` are consumed as given (computed by
// useProfileViewModel), not re-derived from `documents.length` here, so
// this component's rendering rule stays correct automatically once that
// ViewModel derivation is filled in for real.
export function DocumentsSection({ documents, loading, hasDocuments }: DocumentsSectionProps) {
  return (
    <section className="flex flex-col gap-2.5 px-5.5">
      <h2 className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">
        Mes documents{!loading && ` · ${documents.length} document${documents.length > 1 ? 's' : ''}`}
      </h2>

      {loading ? (
        // No Skeleton primitive vendored in this repo yet, and the spec
        // explicitly says not to introduce one just for this screen — plain
        // loading text is enough for AC-PR-16's 3s budget.
        <p className="text-[13px] text-white/50">Chargement…</p>
      ) : !hasDocuments ? (
        // AC-PR-14 — an explicit empty row, never a silently absent section.
        <p className="text-[13px] text-white/50">Aucun document</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((document, index) => (
            // TODO: `Document` carries an `id` (domain/entities/document.ts)
            // that would make a better list key than an index — this
            // component only receives the {type, status} subset per the
            // ViewModel's exposed shape (spec's "ViewModel..." list), so it
            // doesn't have one. Worth reconsidering if that shape changes.
            <DocumentRow key={`${document.type}-${index}`} document={document} />
          ))}
        </ul>
      )}
    </section>
  )
}
