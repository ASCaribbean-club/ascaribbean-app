// specs/web-create-convocation.md UI design — `JJ/MM/AAAA · HH:MM` (fr-FR).
export function formatConvocationDateTime(iso: string): string {
  const date = new Date(iso)
  const datePart = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart} · ${timePart}`
}

export function formatConvocationDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatConvocationTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
