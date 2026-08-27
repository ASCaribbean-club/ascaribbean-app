// Règle dérivée de l'état d'un jeu de Document : "qu'est-ce qui est vrai",
// jamais "qui a le droit" (ça reste dans domain/policies/) — même
// distinction que domain/rules/convocation-rules.ts.

import type { Document } from '../entities/document'

// specs/player-dashboard.md §1 point 2 / AC-PD-13 — the "Document manquant"
// banner is rendered only if the user has at least one Document whose
// status is 'missing' or 'rejected'.
export function hasMissingOrRejectedDocument(documents: Document[]): boolean {
  return documents.some((d) => isMissingOrRejectedDocument(d))
}

export function isMissingOrRejectedDocument(document: Document): boolean {
  return document.status === "missing" || document.status === "rejected"
}
