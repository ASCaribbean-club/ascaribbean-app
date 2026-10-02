import { AuthCard } from '../components/AuthCard'
import { Button } from '../../../shared/components/ui/button'
import { Checkbox } from '../../../shared/components/ui/checkbox'
import { Label } from '../../../shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '../../../shared/components/ui/radio-group'
import { ScrollToReadBox } from './components/ScrollToReadBox'
import {
  CHARTER_INTRO,
  CHARTER_SECTIONS,
  IMAGE_RIGHTS_CONSENT_LABEL,
  IMAGE_RIGHTS_INTRO,
  IMAGE_RIGHTS_REFUSAL_LABEL,
  IMAGE_RIGHTS_SECTIONS,
} from './charter-content'
import { useCharterViewModel } from './useCharterViewModel'

export function CharterPage() {
  const vm = useCharterViewModel()

  return (
    <AuthCard
      title="Charte du club"
      subtitle={
        vm.step === 'charter'
          ? 'Étape 1 sur 2 — lisez la charte jusqu’en bas pour pouvoir la valider.'
          : 'Étape 2 sur 2 — lisez l’autorisation jusqu’en bas pour faire votre choix.'
      }
    >
      {vm.step === 'charter' ? (
        <>
          <h2 className="text-sm font-extrabold text-auth-text">Charte AS Caribbean 2026–2027</h2>
          <ScrollToReadBox intro={CHARTER_INTRO} sections={CHARTER_SECTIONS} onReachedEnd={vm.markCharterRead} />
          <Label htmlFor="charter-accept" className="items-start gap-2.5 text-[12.5px] font-semibold text-auth-text">
            <Checkbox
              id="charter-accept"
              checked={vm.charterAccepted}
              disabled={!vm.hasScrolledCharter}
              onCheckedChange={(checked) => vm.setCharterAccepted(checked === true)}
              className="mt-0.5 size-4.5 border-auth-border data-[state=checked]:border-auth-primary data-[state=checked]:bg-auth-primary"
            />
            J’ai lu la charte de l’AS Caribbean et je m’engage à la respecter.
          </Label>
          <Button
            type="button"
            disabled={!vm.canContinue}
            onClick={vm.goToImageRights}
            className="h-auto w-full rounded-full bg-auth-primary py-3.5 text-sm font-bold text-white hover:bg-auth-primary-hover disabled:bg-auth-disabled-bg disabled:text-auth-disabled-text"
          >
            Continuer
          </Button>
        </>
      ) : (
        <>
          <h2 className="text-sm font-extrabold text-auth-text">Autorisation de droit à l’image</h2>
          <p className="text-xs text-auth-text-muted">Choix facultatif, distinct de l’acceptation de la charte.</p>
          <ScrollToReadBox intro={IMAGE_RIGHTS_INTRO} sections={IMAGE_RIGHTS_SECTIONS} onReachedEnd={vm.markImageRightsRead} />
          <RadioGroup
            value={vm.imageRightsChoice}
            disabled={!vm.hasScrolledImageRights}
            onValueChange={(value) => vm.setImageRightsChoice(value === 'authorize' ? 'authorize' : 'refuse')}
            className="gap-3"
          >
            <Label htmlFor="image-rights-authorize" className="items-start gap-2.5 text-[12.5px] font-semibold text-auth-text">
              <RadioGroupItem id="image-rights-authorize" value="authorize" className="mt-0.5" />
              {IMAGE_RIGHTS_CONSENT_LABEL}
            </Label>
            <Label htmlFor="image-rights-refuse" className="items-start gap-2.5 text-[12.5px] font-semibold text-auth-text">
              <RadioGroupItem id="image-rights-refuse" value="refuse" className="mt-0.5" />
              {IMAGE_RIGHTS_REFUSAL_LABEL}
            </Label>
          </RadioGroup>
          <Button
            type="button"
            disabled={!vm.canAccept}
            onClick={vm.accept}
            className="h-auto w-full rounded-full bg-auth-primary py-3.5 text-sm font-bold text-white hover:bg-auth-primary-hover disabled:bg-auth-disabled-bg disabled:text-auth-disabled-text"
          >
            {vm.isAccepting ? 'Enregistrement…' : 'Activer mon compte'}
          </Button>
          <Button type="button" variant="ghost" onClick={vm.backToCharter} disabled={vm.isAccepting} className="h-auto w-full py-2 text-xs font-semibold text-auth-text-muted">
            Retour à la charte
          </Button>
        </>
      )}
    </AuthCard>
  )
}
