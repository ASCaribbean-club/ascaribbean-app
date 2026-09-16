import { IconEyeOff } from '@tabler/icons-react'

// specs/player-vote.md §3 / UI design §"Bandeau de confidentialité" — the
// mockup's banner promises "Votes anonymes... personne ne voit qui a voté
// quoi" (an ANONYMITY claim). §3 of the spec establishes that's actually a
// PSEUDONYMITY: the voter's identity has to exist in the database for
// AC-PV-04 (one vote per category/voter) and AC-PV-05 ("changer mon vote")
// to even work, and an admin/direct-DB access could reconstruct it. AC-PV-11
// requires the copy not to promise more than the model guarantees.
//
// The wording below is a CALIBRATED PLACEHOLDER, not a final text — the
// spec is explicit that the real copy is a référent RGPD deliverable
// (AC-PV-11), not something this pass writes. Two things are already fixed
// regardless of final wording: (1) the word "anonyme" doesn't appear in the
// bold lead-in, (2) the icon is an "not shown in the app" pictogram
// (eye-off) rather than a shield/padlock, which would imply a stronger
// security guarantee than what's actually held (UI design, same section).
//
// TODO: AC-PV-11 — swap this copy for the référent RGPD's validated wording
// before this ships to real users. Do not treat this text as final.
export function VotePrivacyNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
      <IconEyeOff className="mt-0.5 size-5 shrink-0 text-white/50" aria-hidden />
      <p className="text-[12.5px] leading-snug text-white/70">
        <span className="font-bold text-white">Vote non visible dans l'appli.</span> Personne ne voit ton choix à l'écran, ni les
        joueurs, ni le coach. Seuls les pourcentages sont publiés, une fois ton vote enregistré.
      </p>
    </div>
  )
}
