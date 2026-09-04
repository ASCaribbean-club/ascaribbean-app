interface MenuSectionTitleProps {
  children: React.ReactNode
}

// Same section-label pattern already used elsewhere in the app
// (TypeSelector.tsx/RecipientsCard.tsx "DESTINATAIRES") — reused rather
// than inventing a new one. specs/menu.md addendum 2026-09-04: section
// titles are restored from the mockup, including above disabled cards
// (overrides the earlier "no title over an empty section" rule, which no
// longer applies since these sections aren't empty — see DisabledMenuCard).
export function MenuSectionTitle({ children }: MenuSectionTitleProps) {
  return <h2 className="text-[11.5px] font-extrabold tracking-wider text-white/50 uppercase">{children}</h2>
}
