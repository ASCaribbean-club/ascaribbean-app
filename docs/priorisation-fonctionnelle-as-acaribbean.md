# Priorisation fonctionnelle — AS Caribbean
 
> Corrigée à partir du CDC officiel (sections 1, 4, et exigences transversales). Remplace le draft précédent.
 
## Ce qui était faux dans le draft précédent
 
- Il n'existe pas de zone publique / vitrine / actualités / formulaire d'inscription — appli interne, comptes par invitation uniquement. Toute la ligne "Visiteur" est supprimée.
- Les cotisations étaient classées en P0 — le CDC les place en **P1** (section 4).
- Le module ASC Legacy, absent du draft précédent, est un module P1 à part entière (section 8) : points, badges, avantages.
- Le suivi santé/blessures (section 6.3) est un sous-module sensible du suivi sportif (P0), avec des règles d'accès très restrictives.
- Le journal d'audit (section 11.3) n'apparaissait nulle part — c'est une exigence transversale non négociable, pas une fonctionnalité optionnelle.
## P0 — MVP indispensable (section 4 du CDC)
 
| Module | Contenu | Rôles principalement concernés |
|---|---|---|
| Authentification et profils | Comptes, rôles, permissions, invitation, MFA admin | Tous |
| Adhérents et licences | Dossiers, statuts, pièces | Dirigeant habilité, Joueur/Joueuse (son dossier) |
| Équipes et sections | Effectifs, staffs, saisons | Responsable de section, Coach/Staff, Administrateur |
| Calendrier et convocations | Entraînements, matchs, réunions, mode dégradé offline | Coach/Staff (création), Joueur/Joueuse (consultation) |
| Présences et suivi sportif | Assiduité, progression, évaluations, indisponibilités santé | Coach/Staff, Référent médical (santé), Joueur/Joueuse |
| Documents et consentements | Justificatifs, chartes, statuts de pièce | Dirigeant habilité, Joueur/Joueuse |
 
## P1 — Important pour la première version (section 4)
 
| Module | Contenu |
|---|---|
| ASC Legacy | Points, badges, avantages, classements |
| Cotisations | Tarification, échéancier, relance, export — **sans encaissement en ligne** (7.2) |
| Événements et bénévoles | Postes, missions, affectations, bilan |
| Communication | Annonces et notifications ciblées, préférences par canal |
| Statistiques et exports | Tableaux de bord par rôle, exports CSV/PDF filtrés |
 
## P2 — Différé / V2 (sections 1 et 4)
 
| Fonctionnalité |
|---|
| Messagerie instantanée complète |
| Paiement en ligne intégré |
| Vidéo et analyse VEO intégrées |
| Boutique et gestion de stock avancée |
| Application native iOS / Android |
| Intégrations fédérales automatisées |
| Médias et journalisme (module complet) |
| Partenaires et matériel |
 
## Exigences transversales — non négociables dès le P0
 
Ces points ne figurent pas dans le tableau des modules mais ne sont pas optionnels :
 
- **Journal d'audit** (section 11.3) : traçabilité de toute action sensible (création/suppression compte, changement de rôle, consultation donnée santé, modification paiement, correction points Legacy, export nominatif)
- **RGPD / sécurité** (section 13) : HTTPS/TLS, hachage des mots de passe, chiffrement au repos pour données sensibles, procédure d'incident, AIPD à envisager
- **Accessibilité et performance** (section 12) : contrastes AA, navigation clavier, affichage < 3s, disponibilité visée 99,5 %
- **Réversibilité** (sections 12 et 21) : export complet des données dans un format exploitable — réponse directe au risque "dépendance au prestataire"
## Matrice RBAC (permissions par rôle)
 
> Reconstruite à partir des rôles réels du CDC (section 3) et des critères d'acceptation (section 17.2). Remplace l'ancienne matrice à 4 rôles.
 
| Permission | Joueur/Joueuse | Coach/Staff | Resp. section | Dirigeant habilité | Trésorier | Référent médical | Bénévole | Administrateur |
|---|---|---|---|---|---|---|---|---|
| Voir son propre profil/dossier | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir les dossiers des autres membres | ❌ | ❌ (son équipe, hors financier) | ✅ (sa section) | ✅ | ❌ (financier seulement) | ❌ (santé seulement, tracé) | ❌ | ✅ |
| Créer/modifier une convocation | ❌ | ✅ (son équipe) | ✅ (sa section) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Consulter une convocation en mode dégradé | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Saisir une évaluation sportive | ❌ | ✅ (son équipe) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Consulter une donnée de santé (hors diagnostic) | ✅ (soi-même) | ❌ (aptitude seulement, si accordée) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ (sauf audit) |
| Voir le statut de cotisation | ✅ (soi-même) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Gérer échéanciers et relances | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (paramétrage) |
| Gérer postes/missions bénévoles | ❌ | ❌ | ✅ (sa section) | ✅ | ❌ | ❌ | ❌ (consulte/confirme) | ✅ |
| Envoyer une communication ciblée | ❌ | ✅ (son équipe) | ✅ (sa section) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Exporter des données | ❌ | ❌ | ✅ (sa section, champs autorisés) | ✅ | ✅ (financier) | ❌ | ❌ | ✅ (tout, tracé) |
| Gérer comptes, rôles, paramétrage | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Consulter le journal d'audit | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
 
**Points de vigilance issus du CDC :**
- Le référent médical a un accès "nominatif très restreint et tracé" — chaque consultation d'une donnée santé doit être journalisée (sections 6.3 et 11.3).
- Un coach peut recevoir une **aptitude** (apte/inapte) sans voir le diagnostic — c'est une permission distincte de "voir la donnée de santé complète", à bien séparer dans le modèle.
- AC-01/AC-02 (section 17.2) : un joueur ne voit que son propre dossier, un coach seulement les équipes auxquelles il est affecté — critères d'acceptation à tester explicitement en recette.
## Points encore ouverts
 
- Grille ASC Legacy définitive (barèmes, seuils, badges) : à valider par le Bureau avant développement (section 8)
- Données santé réellement nécessaires : décision à valider par le référent RGPD (section 22, décision n°5)