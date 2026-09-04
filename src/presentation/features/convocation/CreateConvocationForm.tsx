import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { Button } from '../../shared/components/ui/button'
import { Input } from '../../shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/components/ui/select'
import { DateTimeInput } from './components/DateTimeInput'
import { FIELD_CLASSNAME } from './components/field-style'
import { FormField } from './components/FormField'
import { MeetingAgendaField } from './components/MeetingAgendaField'
import { RecipientsCard } from './components/RecipientsCard'
import { SegmentedToggle } from './components/SegmentedToggle'
import { TypeSelector } from './components/TypeSelector'
import { TRAINING_LOCATIONS } from './training-locations'
import { useCreateConvocationViewModel, type ConvocationFormValues } from './useCreateConvocationViewModel'

// Date/Heure and RDV — heure/lieu rows: 130px is comfortable room for either
// a plain text field or DateTimeInput's own compact display text (see that
// component — it no longer relies on the native date/time control's actual
// rendered width, which is what previously forced this column wider or got
// clipped). `auto-fit`/`minmax` still keeps two columns fitting spec's
// "côte à côte" (specs/create-convocation.md §8) down to the narrowest
// supported width (320px) with margin to spare — see CLAUDE.md §6, "Mobile
// touch targets and side-by-side fields".
const FIELD_ROW_CLASSNAME = 'grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3'

interface CreateConvocationFormProps {
  // specs/create-convocation.md §1: kept for a future edit screen to reuse
  // this exact component visually — no UpdateConvocationUseCase/ViewModel
  // exists yet, so nothing passes this prop today. The route element below
  // renders it with no props, i.e. an always-empty form.
  initialValues?: Partial<ConvocationFormValues>
}

// The whole "Nouvelle convocation" screen (ARCHITECTURE.md §6 — this
// component renders, it doesn't decide: every branch below is an
// isLoading/hasTeam/type-equality check on values the ViewModel already
// computed). Notably this is the route's element directly, not a
// `<Feature>Page.tsx` wrapping a shared form — see the file-tree note in
// specs/create-convocation.md §1: the form itself IS the screen, so a
// future Calendrier entry point can push this exact component with no
// wrapper to duplicate.
export function CreateConvocationForm({ initialValues }: CreateConvocationFormProps = {}) {
  const vm = useCreateConvocationViewModel(initialValues)

  if (!vm.hasTeam) {
    // See the TODO in useCreateConvocationViewModel about *why* this can
    // happen (lost router state) — rendered here as a dead end with a way
    // back, not a silent redirect, so it's visible during development.
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-coach-bg px-6 text-center font-coach text-white">
        <p className="text-sm text-white/60">Équipe introuvable pour cette convocation.</p>
        <Button onClick={vm.goBack} variant="outline" className="border-white/20 text-white">
          Retour
        </Button>
      </div>
    )
  }

  const { values } = vm

  return (
    <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
      <BackHeader title="Nouvelle convocation" onBack={vm.goBack} />

      <div className="flex flex-1 flex-col gap-6 px-5.5 pt-5.5 pb-20">
        <TypeSelector value={values.type} onChange={vm.setType} />

        {values.type === 'match' && (
          <div className="flex flex-col gap-5">
            <FormField label="Adversaire" htmlFor="opponentId">
              <Select value={values.opponentId} onValueChange={vm.setOpponentId}>
                <SelectTrigger id="opponentId" className={FIELD_CLASSNAME}>
                  <SelectValue placeholder="Choisir un adversaire" />
                </SelectTrigger>
                <SelectContent>
                  {vm.opponents.map((opponent) => (
                    <SelectItem key={opponent.id} value={opponent.id}>
                      {opponent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Lieu de la rencontre" htmlFor="isHome">
              <SegmentedToggle
                value={values.isHome}
                onChange={vm.setIsHome}
                trueLabel="Domicile"
                falseLabel="Extérieur"
                trueColor="coach-green"
                falseColor="coach-red"
              />
            </FormField>

            <div className={FIELD_ROW_CLASSNAME}>
              <FormField label="Date" htmlFor="date">
                <DateTimeInput id="date" type="date" value={values.date} onChange={vm.setDate} min={vm.minDate} />
              </FormField>
              <FormField label="Heure" htmlFor="time">
                <DateTimeInput id="time" type="time" value={values.time} onChange={vm.setTime} />
              </FormField>
            </div>

            <FormField label="Lieu" htmlFor="location">
              <Input
                id="location"
                value={values.location}
                onChange={(event) => vm.setLocation(event.target.value)}
                placeholder="Ex: Stade municipal"
                className={FIELD_CLASSNAME}
              />
            </FormField>

            <div className={FIELD_ROW_CLASSNAME}>
              <FormField label="Heure de RDV" htmlFor="meetingPointTime">
                <DateTimeInput
                  id="meetingPointTime"
                  type="time"
                  value={values.meetingPointTime}
                  onChange={vm.setMeetingPointTime}
                />
              </FormField>
              <FormField label="Lieu de RDV" htmlFor="meetingPointLocation">
                <Input
                  id="meetingPointLocation"
                  value={values.meetingPointLocation}
                  onChange={(event) => vm.setMeetingPointLocation(event.target.value)}
                  placeholder="Ex: Vestiaires"
                  className={FIELD_CLASSNAME}
                />
              </FormField>
            </div>
          </div>
        )}

        {values.type === 'training' && (
          <div className="flex flex-col gap-5">
            <div className={FIELD_ROW_CLASSNAME}>
              <FormField label="Date" htmlFor="date">
                <DateTimeInput id="date" type="date" value={values.date} onChange={vm.setDate} min={vm.minDate} />
              </FormField>
              <FormField label="Heure" htmlFor="time">
                <DateTimeInput id="time" type="time" value={values.time} onChange={vm.setTime} />
              </FormField>
            </div>

            {/* §2 "Lieu d'entraînement" — a select over Convocation.location
                itself (same column match/meeting use as free text), fed by
                the fixed TRAINING_LOCATIONS list, not a real referentiel. */}
            <FormField label="Lieu d'entraînement" htmlFor="location">
              <Select value={values.location} onValueChange={vm.setLocation}>
                <SelectTrigger id="location" className={FIELD_CLASSNAME}>
                  <SelectValue placeholder="Choisir un lieu" />
                </SelectTrigger>
                <SelectContent>
                  {TRAINING_LOCATIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}

        {values.type === 'meeting' && (
          <div className="flex flex-col gap-5">
            <FormField label="Titre" htmlFor="title">
              <Input
                id="title"
                value={values.title}
                onChange={(event) => vm.setTitle(event.target.value)}
                placeholder="Ex: Réunion staff"
                className={FIELD_CLASSNAME}
              />
            </FormField>

            <div className={FIELD_ROW_CLASSNAME}>
              <FormField label="Date" htmlFor="date">
                <DateTimeInput id="date" type="date" value={values.date} onChange={vm.setDate} min={vm.minDate} />
              </FormField>
              <FormField label="Heure" htmlFor="time">
                <DateTimeInput id="time" type="time" value={values.time} onChange={vm.setTime} />
              </FormField>
            </div>

            <FormField label="Lieu" htmlFor="location">
              <Input
                id="location"
                value={values.location}
                onChange={(event) => vm.setLocation(event.target.value)}
                placeholder="Ex: Stade municipal"
                className={FIELD_CLASSNAME}
              />
            </FormField>

            <MeetingAgendaField agenda={values.agenda} onChange={vm.setAgenda} />
          </div>
        )}

        <RecipientsCard count={vm.recipientsCount} />
      </div>

      {/* Anchored submit button (UI design §"Structure de l'écran", point 5)
          — no bottom nav on this route (§"Emplacement dans la nav"), so this
          sits directly above the safe area rather than above a BottomNav. */}
      <div className="sticky bottom-0 bg-gradient-to-t from-coach-bg via-coach-bg to-transparent px-5.5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {vm.fieldError && (
          <p role="alert" className="mb-2 text-center text-[12.5px] font-semibold text-coach-red-text">
            {vm.fieldError}
          </p>
        )}
        <Button
          onClick={vm.onSubmit}
          disabled={!vm.canSubmit}
          className="h-auto w-full rounded-full bg-white py-3.5 text-[15px] font-extrabold text-black hover:bg-white/90 disabled:opacity-40"
        >
          Créer la convocation
        </Button>
      </div>
    </div>
  )
}
