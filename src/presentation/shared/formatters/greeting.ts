// Purely display: "Bonjour, {prénom}" (specs/coach-dashboard.md §1 point 1).
// User.fullName has no separate firstName field in domain/entities/user.ts —
// this is the display-only split, not a business rule, so it stays a
// formatter rather than a domain concern.
export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

// Avatar initials (specs/coach-dashboard.md UI design §1: "Avatar / initiales").
// First letter of the first two words — display-only, same rationale as getFirstName.
export function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/)
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}
