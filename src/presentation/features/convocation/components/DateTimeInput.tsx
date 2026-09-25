import type { ChangeEvent, MouseEvent } from 'react'
import { Input } from '../../../shared/components/ui/input'
import { cn } from '../../../shared/lib/utils'
import { FIELD_CLASSNAME } from './field-style'

interface DateTimeInputProps {
  id: string
  type: 'date' | 'time'
  value: string
  onChange: (value: string) => void
  // `date` fields only — see useCreateConvocationViewModel's `minDate`.
  min?: string
  // Overrides FIELD_CLASSNAME's box styling (height/border/radius/padding/
  // text size) on BOTH the invisible native input and its visible display
  // sibling — the two must always match, since the visible one is what
  // determines this control's actual on-screen box. Used by
  // MatchDetailsEditForm (docs/designs/coach-match-details/...) to render
  // the same taller, pill-shaped (`rounded-full`) field box the rest of
  // that form uses, distinct from CreateConvocationForm's own `rounded-lg`
  // fields. Omitted, CreateConvocationForm's rendering is byte-for-byte
  // unchanged (falls back to FIELD_CLASSNAME).
  className?: string
}

// Chromium only opens the native picker overlay when the click lands on the
// tiny calendar/clock icon — clicking the rest of the field just places a
// text cursor in a segment. showPicker() (Chrome/Firefox, unsupported in
// Safari — a no-op there via optional chaining) makes the whole field open
// it, matching what "a picker" implies. iOS Safari opens it on any tap by
// default, so this line is inert there, not required.
function openPicker(event: MouseEvent<HTMLInputElement>) {
  event.currentTarget.showPicker?.()
}

// `value` is always `YYYY-MM-DD` (native `<input type="date">`'s wire
// format) or `HH:MM` — reformatted for *display only*, the input itself
// still receives/emits the native format untouched.
function formatDisplayValue(type: 'date' | 'time', value: string): string {
  if (!value) return type === 'date' ? 'jj/mm/aaaa' : '--:--'
  if (type === 'time') return value
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

// The native `<input type="date">`/`type="time">` is kept — it's still what
// actually receives the tap and opens the OS picker (Safari) or `showPicker`
// (Chromium/Firefox) above, and it's what a screen reader exposes (opacity
// doesn't remove an element from the accessibility tree). But it's rendered
// fully invisible (`opacity-0`) rather than showing its own drawn value,
// because verified on-device (iOS Simulator, real WebKit) that Safari
// renders a filled `type="date"` spelled out in full — "21 août 2026" in
// fr-FR, not "21/08/2026" — at a used-width it refuses to shrink below no
// matter the CSS box/track given, wider than two fields can share on a
// phone screen. Clipping that overflow (an earlier attempt, on the wrapper
// in FormField.tsx) cut into the field's own border, not just the spillover
// — visibly broken. Instead this renders our *own* compact text
// (`formatDisplayValue`) in a plain sibling `<div>` sized to the real
// `FIELD_CLASSNAME` box, which never needs to overflow it, so there's
// nothing left to clip. The overlay-placeholder attempt this same approach
// might look like it repeats (see git history) failed differently: it drew
// custom text *on top of* an otherwise-normal, still-opaque native input,
// so the native format hint showed through underneath it — two texts, one
// box. Here the native input contributes no visible text at all.
export function DateTimeInput({ id, type, value, onChange, min, className }: DateTimeInputProps) {
  const boxClassName = className ?? FIELD_CLASSNAME
  return (
    <div className="relative w-full">
      {/* The real, tappable control — sizing/positioning classes ONLY
          (`absolute inset-0`, so it exactly covers the visible box below,
          whatever that box's own height/shape is). Deliberately does NOT
          receive `boxClassName`'s decorative utilities (border/bg/rounded/
          `flex`/padding/text-size): it's invisible anyway, and putting
          `display: flex` directly on a native `<input type="date"/"time">`
          breaks the browser's own internal picker/tap handling on real
          devices (iOS Safari in particular — the native control's internal
          layout assumes normal block flow, same class of platform quirk
          already documented below for the filled-value rendering issue).
          Fixed here rather than only in MatchDetailsEditForm's own compact
          box, since CreateConvocationForm's fields carried the same latent
          bug (FIELD_CLASSNAME also sets `flex items-center`). */}
      <Input
        id={id}
        type={type}
        value={value}
        min={min}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        onClick={openPicker}
        className="absolute inset-0 h-full w-full cursor-pointer overflow-hidden opacity-0"
      />
      <div aria-hidden className={cn(boxClassName, 'pointer-events-none', !value && 'text-white/35')}>
        {formatDisplayValue(type, value)}
      </div>
    </div>
  )
}