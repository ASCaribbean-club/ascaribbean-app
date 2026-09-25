// This screen reuses shadcn's Input/Select primitives (shared/components/ui)
// but overrides their default light/dark tokens with the same fixed dark
// palette already used across coach-dashboard (see global.css's comment on
// "Fixed-palette screens" — this app has no `.dark` class toggle, so a
// shadcn primitive left un-styled here would render with LIGHT tokens,
// invisible against the coach-bg screen). One shared class string keeps
// every field on this form visually consistent instead of repeating it at
// each call site.
// `scheme-dark` (color-scheme: dark) is what actually matters for the
// date/time fields: root's `color-scheme: light dark` (global.css) leaves
// Chromium free to draw the calendar/clock icon in its LIGHT (near-black)
// variant whenever the OS/browser is in light mode — invisible against this
// screen's dark bg regardless of text color. Forcing dark here switches
// Chromium to the icon's light/white variant, no filter hack needed. Inert
// on plain text fields (color-scheme only affects native form-control
// chrome), so it's safe to share across every field on this form.
// `h-11` overrides the shared Input/SelectTrigger's `h-8` (32px) default —
// too small a touch target on a mobile-only screen (CLAUDE.md §6, "Mobile
// touch targets and side-by-side fields"); 44px matches the platform
// minimum. `cn()`'s twMerge dedupes this against the primitive's own `h-8`.
export const FIELD_CLASSNAME =
  'scheme-dark h-11 border-white/12 bg-white/5 text-white placeholder:text-white/35 focus-visible:border-white/30 focus-visible:ring-white/15'

// Date/Heure and RDV — heure/lieu rows: 130px is comfortable room for either
// a plain text field or DateTimeInput's own compact display text. `auto-fit`/
// `minmax` keeps two columns fitting "côte à côte" (specs/create-convocation.md
// §8) down to the narrowest supported width (320px) with margin to spare —
// CLAUDE.md §6, "Mobile touch targets and side-by-side fields". Moved here
// from CreateConvocationForm.tsx (specs/edit-match-details.md UI design §3
// — "réutiliser ce vocabulaire plutôt que d'en inventer un second") so
// MatchDetailsEditForm can import the SAME constant rather than a
// hand-copied duplicate that could drift from it.
export const FIELD_ROW_CLASSNAME = 'grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3'