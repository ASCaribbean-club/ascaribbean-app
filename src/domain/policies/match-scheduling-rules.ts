/**
 * Vérifie que l'heure de RDV précède le coup d'envoi, le même jour.
 * Non sourcée par le CDC ni les maquettes — ajoutée par prudence
 * (spec create-convocation.md, résolution PO-CV-09). À assouplir si un
 * cas légitime de RDV la veille ou sur plusieurs jours se présente.
 *
 * Source des paramètres (corrigé en cours de passe, voir match-details.ts) :
 * `rdvTime` vient de `MatchDetails.meetingPointTime`, pas d'un champ de
 * `Convocation` — la fonction elle-même reste inchangée, c'est l'appelant
 * (CreateConvocationUseCase) qui doit construire les deux `Date` à partir
 * des deux entités avant de valider le couple.
 */
export function isValidMatchSchedule(rdvTime: Date, matchTime: Date): boolean {
  const sameDay =
    rdvTime.getFullYear() === matchTime.getFullYear() &&
    rdvTime.getMonth() === matchTime.getMonth() &&
    rdvTime.getDate() === matchTime.getDate()

  return sameDay && rdvTime < matchTime
}
