// "Samedi 14h00 · Stade municipal · RDV 13h30" on the "Prochain match" card
// (specs/coach-dashboard.md UI design §2). `HHhMM` is the informal French
// time notation used throughout the maquette — Intl doesn't produce it, so
// hours/minutes are formatted by hand.
function formatTime(dateIso: string): string {
  const date = new Date(dateIso)
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}h${minutes}`
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

// "Jeudi 18h30 · Stade municipal" — shared base for any convocation's meta
// line ("À venir" list rows, and the "Prochain match" card when it isn't
// rendering an actual match — see formatMatchSchedule below for that case).
export function formatEventSchedule(dateIso: string, location: string): string {
  const weekday = capitalize(new Date(dateIso).toLocaleDateString('fr-FR', { weekday: 'long' }))
  return [`${weekday} ${formatTime(dateIso)}`, location].join(' · ')
}

export function formatMatchSchedule(kickoffIso: string, location: string, meetingPointTime: string | null): string {
  const base = formatEventSchedule(kickoffIso, location)
  return meetingPointTime ? `${base} · RDV ${formatTime(meetingPointTime)}` : base
}
