// PO-WE-09 (specs/web-empty-state.md §5 + "Garde de largeur desktop —
// proposition à confirmer, pas tranchée ici"): both the width THRESHOLD
// (the spec's proposed default is Tailwind's `lg` / 1024px, not a decided
// value) and the DETECTION mechanism are left to the developer by design —
// "mécanisme exact (hook de resize, media query JS) laissé à la
// développeuse." Questions to resolve before replacing the placeholder
// below: resize listener vs. `matchMedia` (+ its `change` event), and what
// this hook should return before the very first measurement — `true`,
// `false`, or a third "not yet known" state, to avoid a flash of the wrong
// screen on load.
//
// `true` is a placeholder so /admin actually renders instead of permanently
// showing BackofficeDesktopOnlyPage — replace it, don't leave it as the
// real implementation.
export function useDesktopViewport(): boolean {
  return true
}
