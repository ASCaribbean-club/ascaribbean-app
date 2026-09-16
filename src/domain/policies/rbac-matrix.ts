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
  // specs/create-convocation.md §3 — 'section-manager' added here. See the
  // matching TODO in can.ts's 'section-manager' branch: adding the role
  // here without that scope check would let a section-manager create a
  // convocation for ANY team, not just one in their own section.
  'convocation:create': ['coach', 'section-manager', 'authorized-officer', 'admin'],
  'convocation:respond': ['player'],
  'section:manage': ['section-manager', 'admin'],

  // specs/coach-attendance-confirmation.md §2 — "Décision de cadrage":
  // ['coach'] only, scoped to their own team (see the matching fix in
  // can.ts's 'coach' branch). NOT 'admin', even though the RLS policies
  // (attendance_records_insert_validate / _update_validate) already grant
  // the write to admin too — that grant predates this action and is kept
  // as a statu quo in RLS, but no matrix entry / UI entry point is built
  // for it in this pass (PO-AT-01, still open). NOT 'section-manager'
  // either, despite the developer's own hunch that they should hold this —
  // the closest matrix row ("Saisir une évaluation sportive") says ❌ for
  // that role, so extending it needs PO-AT-01 resolved first, not an
  // extensive reading of a neighboring row.
  'attendance:validate': ['coach'],

  // specs/player-vote.md §2 — "Il n'existe aucune ligne de matrice
  // applicable" for a positive vote: this is a brand-new matrix row, not an
  // extrapolation of an existing one (the closest CDC line, "Saisir une
  // évaluation sportive", grants the OPPOSITE role pair — coach writes,
  // player reads — reusing it would be a contresens, not a shortcut).
  // Scoped to the voter's own team, same shape as 'convocation:respond'
  // above — enforced by can.ts's 'player' branch (`requiresTeamScope`),
  // extended in the same pass to cover this action too.
  'vote:cast': ['player'],
}
