import { useState, type KeyboardEvent } from 'react'
import { IconPlus, IconX } from '@tabler/icons-react'
import { Button } from '../../../shared/components/ui/button'
import { Input } from '../../../shared/components/ui/input'
import { FIELD_CLASSNAME } from './field-style'

interface MeetingAgendaFieldProps {
  agenda: string[]
  onChange: (next: string[]) => void
}

// "Ordre du jour" — meeting-only (specs/create-convocation.md UI design,
// "Nouveau composant — MeetingAgendaField"). Fully implemented per this
// agent's mandate for presentation components: it's pure list-editing UI
// (add/remove/renumber a string[]), not a business rule — the actual
// business meaning of "agenda" (it maps to MeetingDetails.agenda, §2) is
// decided elsewhere (CreateConvocationUseCase), this component only ever
// hands its parent a new array via `onChange`, never persists anything
// itself.
//
// Numbering is NOT stored — the pastille shown for each row is just its
// index + 1, so deleting an item automatically "renumbers" everything after
// it for free (§ "Suppression d'un point"): no id/position bookkeeping
// needed, exactly per spec ("l'ordre du tableau agenda EST l'ordre
// d'affichage").
export function MeetingAgendaField({ agenda, onChange }: MeetingAgendaFieldProps) {
  // Local-only: the text of the point being drafted before it's committed
  // to `agenda`. Doesn't belong in the ViewModel — it's transient input
  // state with no meaning outside this component (same reasoning as a
  // search box's in-progress query string).
  const [draft, setDraft] = useState('')

  function commitDraft() {
    const trimmed = draft.trim()
    if (!trimmed) return // "un champ vide ne produit pas d'ajout" (spec)
    onChange([...agenda, trimmed])
    setDraft('')
  }

  function removeAt(index: number) {
    onChange(agenda.filter((_, i) => i !== index))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitDraft()
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-bold text-white/70">Ordre du jour</span>
        <span className="text-[12px] font-semibold text-white/50">{agenda.length} points</span>
      </div>

      {agenda.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {agenda.map((point, index) => (
            // Index as key: acceptable here even though a middle item can be
            // removed (not just at the edges) — each row is a plain string
            // with no internal state/uncontrolled input of its own (§2 —
            // "pas d'id par point"), so there's nothing for React to
            // misassociate across a re-render, unlike a key on a row that
            // owned its own form state.
            <li
              key={index}
              className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
            >
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/12 text-[12px] font-bold text-white"
              >
                {index + 1}
              </span>
              <span className="flex-1 text-[13.5px] text-white">{point}</span>
              <button
                type="button"
                aria-label={`Supprimer le point ${index + 1}`}
                onClick={() => removeAt(index)}
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
              >
                <IconX className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ajouter un point..."
          aria-label="Ajouter un point à l'ordre du jour"
          className={`${FIELD_CLASSNAME} border-dashed`}
        />
        <Button
          type="button"
          onClick={commitDraft}
          aria-label="Ajouter le point"
          size="icon"
          className="shrink-0 rounded-lg bg-white/10 text-white hover:bg-white/20"
        >
          <IconPlus className="size-4" />
        </Button>
      </div>

      <p className="m-0 text-[11.5px] text-white/40">Envoyé avec la convocation</p>
    </div>
  )
}
