import type { Role } from '../entities/user'
import type { Action } from './actions'

// Source de référence lisible — chaque politique RLS porte en commentaire SQL
// le nom de l'action correspondante pour vérifier la correspondance à l'œil.
//
// RLS-only vs RLS + entrée ici : une entrée n'a sa place dans cette matrice
// que si presentation/ doit décider quelque chose (afficher/masquer, activer/
// désactiver, brancher un layout) avant ou indépendamment du résultat de la
// requête. Si presentation/ se contente de rendre ce que le repository a
// renvoyé, RLS seule suffit et il ne faut pas dupliquer la règle ici — une
// copie sans consommateur front est un risque de divergence, pas une sécurité
// supplémentaire.
// Exemple RLS-only (donc volontairement absent d'ici) : lecture de son propre
// profil/adhésion/documents, lecture des convocations et réponses de son
// équipe (joueur et coach), lecture admin sans restriction — l'écran ne
// change pas de structure, seul le contenu retourné diffère.
export const rbacMatrix: Record<Action, Role[]> = {
  'convocation:create': ['coach', 'authorized-officer', 'admin'],
  'convocation:respond': ['player'],
  'section:manage': ['section-manager', 'admin'],
}
