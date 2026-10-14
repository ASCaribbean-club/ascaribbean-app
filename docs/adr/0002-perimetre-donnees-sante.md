# ADR 0002 — Périmètre des données de santé réduit (décision CDC n°5)

- **Statut** : accepté
- **Date** : 2026-10-14
- **Contexte** : la décision n°5 du CDC (section 22) est tranchée par le club.

## Décision

L'application **ne gère pas** de diagnostics, de certificats d'aptitude ni de statuts apte/inapte.

| Conservé | Abandonné |
|---|---|
| Statut d'**indisponibilité** d'un joueur, avec un motif optionnel « blessé » ou « malade » | Diagnostics |
| | Certificats d'aptitude |
| | Statuts apte / inapte |
| | Accès nominatif « très restreint et tracé » d'un référent médical à des données médicales |

Un motif « blessé »/« malade » rattaché à un joueur identifiable reste une **donnée de santé** (RGPD art. 9) de faible sensibilité, même catégorie : elle ne doit jamais atteindre un outil tiers (PostHog inclus — voir ADR 0001 et `OBSERVABILITE.md` §5).

## Passages de `docs/` devenus incohérents (à réécrire dans une passe dédiée — ils touchent le RBAC)

| Fichier | Passage | Incohérence |
|---|---|---|
| `roles-personas-as-caribbean.md` l.20, l.46 | Rôle « Référent médical » (« informations santé nécessaires au suivi autorisé, accès nominatif très restreint et tracé ») ; point « Données santé réellement nécessaires » à valider | Le rôle et son périmètre n'ont plus d'objet ; la décision n°5 est tranchée |
| `priorisation-fonctionnelle-as-acaribbean.md` l.10, l.20 | « Suivi santé/blessures » sous-module sensible ; colonne Référent médical (santé) | Le sous-module se réduit à l'indisponibilité |
| même fichier, matrice l.58-65 | Colonne « Référent médical » ; lignes « Consulter une donnée de santé (hors diagnostic) », « aptitude seulement » | Plus de permission « aptitude » ; plus de référent médical |
| même fichier, l.75-76, l.81 | Accès « nominatif très restreint et tracé » ; coach reçoit une **aptitude** sans voir le diagnostic ; décision n°5 « à valider » | Obsolète |
| `RETENTION_PURGE.md` §2 (ligne « Données de santé ») | « Aptitude/inaptitude, indisponibilités santé » | Seules les indisponibilités (`kind = 'medical'`) subsistent |
| `RETENTION_PURGE.md` §2 (« Documents administratifs ») | « Certificats » | Plus de certificats d'aptitude (autres justificatifs à confirmer) |
| `RETENTION_PURGE.md` §4 et §6.1 | Cas particulier données de santé (archivage froid, durées « à valider », décision n°5) | À réécrire pour le périmètre réduit |
| `RETENTION_PURGE.md` §5 | Suppression des « certificats » dans Storage | Idem |
| `ARCHITECTURE.md` §11 (tableau et paragraphe suivant) | Trigger d'audit sur « consultation d'une donnée de santé » ; exigence « accès nominatif très restreint et tracé (section 6.3) » | À reconsidérer : plus de consultation nominative par un référent médical ; le trigger sur `unavailabilities` `kind = 'medical'` reste à arbitrer |
| `GOUVERNANCE.md` §2 (rôle Référent RGPD) | « données sensibles (santé, …) » | Reformuler pour le périmètre réduit |
| `DEFAULTS-A-CHALLENGER.md` l.289-299 | « Priorité médical / suspension » | Terminologie à vérifier (reste valable pour l'indisponibilité) |
| `specs/player-unavailability.md` l.22-26, 85-92, 116-137, 164-170 | Lignes de matrice « Référent médical », « Consulter une donnée de santé », PO-PU-02, trigger d'audit de lecture | Rôle supprimé ; audit à arbitrer |
| Code | `rbac-matrix.ts` (rôle `medical-referent`, permissions santé), `domain/entities/user.ts` (`'medical-referent'`), policies RLS associées | Hors périmètre de cette passe (interdit de toucher RBAC/RLS) |
