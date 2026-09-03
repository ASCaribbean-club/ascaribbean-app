interface AgendaListProps {
  agenda: string[]
}

// Read-only "Ordre du jour" (meeting only, AC-MD-04). Same numbered-pastille
// row shape as MeetingAgendaField.tsx (the create-convocation form's
// editable version), minus the delete icon and the "add a point" input —
// UI design §"Structure de l'écran", point 3: "même forme que
// MeetingAgendaField mais sans icône de suppression ni champ d'ajout".
// Array order IS display order (MeetingDetails.agenda, no separate
// `position` column) — rendered with .map's own index, same as the form.
export function AgendaList({ agenda }: AgendaListProps) {
  if (agenda.length === 0) {
    // AC-MD-04 — an empty agenda gets an explicit substitute line, never a
    // silently empty list (which would look like a loading/broken state).
    return <p className="py-2 text-[13px] text-white/50">Aucun point à l'ordre du jour.</p>
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {agenda.map((point, index) => (
        <li key={index} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/12 text-[12px] font-bold text-white"
          >
            {index + 1}
          </span>
          <span className="flex-1 text-[13.5px] text-white">{point}</span>
        </li>
      ))}
    </ul>
  )
}
