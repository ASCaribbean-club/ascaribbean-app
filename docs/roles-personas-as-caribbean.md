# Rôles & Personas — AS Caribbean
 
> Corrigé à partir du CDC officiel (Cahier des charges Application AS Caribbean 2026-2027, v1.0, 30/07/2026). Remplace intégralement la version précédente.
 
## Correction majeure
 
Le draft initial partait d'une hypothèse fausse : une appli avec zone publique, actualités et formulaire d'inscription, sur la base de 4 rôles génériques (Visiteur, Adhérent, Éducateur, Admin). Le CDC est clair dès la synthèse exécutive : c'est une **application interne** réservée à ceux qui ont déjà un compte club (joueurs, joueuses, coachs, dirigeants, bénévoles). Pas de rôle "Visiteur/Prospect", pas de zone publique, pas d'inscription en ligne — les comptes sont créés par **invitation** (section 3.1).
 
Le CDC définit aussi 8 rôles, bien plus granulaires que le "Admin" monolithique imaginé initialement (section 3).
 
## Vue d'ensemble des rôles (section 3 du CDC)
 
| Rôle | Principaux droits | Limites essentielles |
|---|---|---|
| Joueur / Joueuse | Profil personnel, calendrier, convocations, présences, documents, points Legacy | Aucun accès aux dossiers des autres membres |
| Coach / Staff | Effectif de son équipe, présences, évaluations, convocations, observations | Pas de données financières globales |
| Responsable de section | Pilotage de sa section, événements, effectifs, documents et rapports | Pas d'administration hors périmètre |
| Dirigeant habilité | Adhérents, licences, paiements, documents, communication et exports | Droits accordés par fonction |
| Trésorier | Cotisations, échéanciers, relances, exports financiers | Données sportives limitées |
| Référent médical | Informations santé nécessaires au suivi autorisé | Accès nominatif très restreint et tracé |
| Bénévole | Missions, planning, consignes et confirmations | Pas d'accès aux dossiers adhérents |
| Administrateur | Paramétrage, comptes, rôles, saisons, sécurité et audit | Actions sensibles journalisées |
 
> Règle de sécurité (CDC) : principe du moindre privilège — aucun droit n'est accordé par défaut au-delà des besoins du rôle.
 
## Comptes multi-rôles — confirmé par le CDC lui-même
 
Le CDC valide directement ce qu'on avait anticipé : "Un utilisateur peut cumuler plusieurs rôles (ex. président et joueur)" (section 3). Ça confirme :
- un modèle de données many-to-many utilisateur↔rôle (pas de champ `role` unique sur l'utilisateur)
- une logique de routing post-authentification capable de gérer les comptes multi-rôles
## Gestion des comptes (section 3.1)
 
- Invitation par courriel ou lien sécurisé ; activation après acceptation de la charte
- Connexion par courriel/mot de passe, avec option de lien de connexion à usage unique
- Réinitialisation sécurisée, révocation immédiate en cas de départ
- **Double authentification obligatoire pour les administrateurs**, recommandée aux dirigeants
- Possibilité de désactiver un compte sans supprimer son historique
## Personas — à retravailler
 
Les fiches personas détaillées (objectifs, douleurs, fréquence d'usage) restent globalement valables pour Joueur/Joueuse et Coach/Staff, mais doivent être écrites pour les 6 autres rôles (Responsable de section, Dirigeant habilité, Trésorier, Référent médical, Bénévole, Administrateur), chacun ayant un périmètre distinct d'après le CDC. Pas fait ici pour ne pas surcharger — à faire rôle par rôle si utile.
 
## Points ouverts
 
1. **Granularité du Bureau** : ma proposition de "différer" cette décision ne colle pas au CDC — Responsable de section / Dirigeant habilité / Trésorier / Administrateur sont déjà 4 rôles distincts dans le module P0 "Authentification et profils". Ce point est donc rouvert, pas vraiment un choix.
2. **Grille ASC Legacy définitive** (barèmes, seuils, badges) : explicitement "à valider avant développement" par le Bureau (section 8) — hors périmètre conception produit initiale.
3. **Données santé réellement nécessaires** : décision à valider par le référent RGPD avant consultation (section 22, décision n°5).
4. **Référent projet et référent RGPD** : à désigner côté club avant d'aller plus loin (fiche de contrôle du document, section "Validation attendue").