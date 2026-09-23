// specs/web-dashboard.md §"Sidebar — MissingRoleAlert"/PO-WD-02 (second
// volet, non tranché — position par défaut retenue) — "N utilisateur(s)
// sans rôle assigné : {nom(s)}", beyond the mockup's own single-account
// case: the first `maxVisible` full names, comma-separated, followed by
// "et N autres" once the list overflows that cap. Pure display formatting
// (CLAUDE.md §5), never a business rule — the FILTERING of which accounts
// qualify stays in the ViewModel/domain predicate, this only joins strings.
export function formatNameList(names: string[], maxVisible = 3): string {
  if (names.length <= maxVisible) return names.join(', ')

  const visible = names.slice(0, maxVisible)
  const remaining = names.length - maxVisible
  return `${visible.join(', ')} et ${remaining} autre${remaining > 1 ? 's' : ''}`
}
