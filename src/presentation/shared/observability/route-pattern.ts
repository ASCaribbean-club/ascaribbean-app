// Remplace chaque segment égal à la valeur d'un paramètre par ":nom" —
// "/convocations/abc-123" + { id: "abc-123" } → "/convocations/:id".
// Aucun identifiant ni nom ne doit sortir de l'app dans une URL.
export function toRoutePattern(pathname: string, params: Readonly<Record<string, string | undefined>>): string {
  const byValue = new Map<string, string>()
  for (const [name, value] of Object.entries(params)) {
    if (value) byValue.set(value, name)
  }
  const segments = pathname.split('/').map((segment) => {
    const decoded = safeDecode(segment)
    const name = byValue.get(segment) ?? byValue.get(decoded)
    return name ? `:${name}` : segment
  })
  return segments.join('/') || '/'
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}
