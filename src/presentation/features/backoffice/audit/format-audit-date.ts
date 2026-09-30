// specs/web-audit-logs.md UI design, "Tableau à quatre colonnes" — renders
// JJ/MM/AAAA à HH:MM (fr-FR): the mockup's own raw ISO timestamp
// (AAAA-MM-JJ HH:MM:SS) is a deliberate deviation — no other screen in this
// backoffice renders an ISO date, and this one shouldn't be the first.
export function formatAuditDate(date: Date): string {
  const datePart = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timePart = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} à ${timePart}`
}
