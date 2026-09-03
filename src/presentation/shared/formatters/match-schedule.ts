// "Samedi 14h00 · Stade municipal · RDV 13h30" on the "Prochain match" card
// (specs/coach-dashboard.md UI design §2). `HHhMM` is the informal French
// time notation used throughout the maquette — Intl doesn't produce it, so
// hours/minutes are formatted by hand.
// Exported (not just used internally) so specs/match_details_page.md's Infos
// tab can render "RDV — heure" (MatchDetails.meetingPointTime) as a bare
// "13h30" — a full formatDateTime/formatEventSchedule would also print a
// weekday, which AC-MD-03 doesn't ask for on that specific row (the weekday
// is already shown once, on "Coup d'envoi").
export function formatTime(dateIso: string): string {
  const date = new Date(dateIso)
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}h${minutes}`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatConvocationDate(dateIso: string): string {
  const date = new Date(dateIso)

  const weekday = capitalize(date.toLocaleDateString('fr-FR', { weekday: 'long' }))
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric' })
  const month = capitalize(date.toLocaleDateString('fr-FR', { month: 'long' }))

  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const time = `${hours}h${minutes}`

  return `${weekday} ${day} ${month} · ${time}`
}

// "Jeudi 10 Septembre · 18h30 · Stade municipal" — shared base for any convocation's meta
// line ("À venir" list rows).
export function formatEventSchedule(dateIso: string, location: string): string {
  return [formatConvocationDate(dateIso), location].join(' · ')
}
