# Gouvernance des comptes et accès — AS Caribbean
 
> Statut : proposition à valider par le président (référent projet) et le Bureau.
> Dernière mise à jour : 05/08/2026.
> Ce document répond directement au risque « dépendance au prestataire » identifié en section 21 du CDC. Il doit être tenu à jour à chaque changement de titulaire, de rôle ou d'outil.
 
## 1. Principe directeur
 
Le club doit pouvoir continuer à faire évoluer et héberger l'application **sans dépendre d'une personne physique en particulier**, développeur inclus. Concrètement, ça veut dire :
 
- Tout compte de service (hébergement, base de données, nom de domaine, email) est **détenu par le club**, sous une identité qui appartient au club — jamais sous l'adresse email personnelle d'un bénévole ou du développeur.
- Le développeur dispose des accès nécessaires pour travailler, mais **jamais du rôle « propriétaire »** sur les comptes qui engagent le club (facturation, suppression d'organisation, transfert de domaine).
- Aucun mot de passe n'est partagé par message ou email en clair. Chaque outil listé ci-dessous propose un système natif d'invitation par email avec rôles distincts — c'est le seul canal utilisé.
- Ce document est la seule source de vérité sur qui a accès à quoi. Il est versionné dans le dépôt Git du projet, donc lui-même soumis au principe de réversibilité.
## 2. Rôles et responsabilités
 
| Rôle | Titulaire | Responsabilité |
|---|---|---|
| **Référent projet / titulaire des comptes** | Président du club | Détient la propriété légale et administrative de tous les comptes de service. Seul habilité à des actions irréversibles (suppression d'organisation, transfert de domaine, résiliation d'abonnement). |
| **Mainteneur technique** | Développeur | Accès de développement et de déploiement sur l'ensemble des outils. Peut quitter le projet à tout moment sans que cela bloque le club. |
| **Référent RGPD** | À désigner (point ouvert, cf. CDC section 22) | Valide les décisions relatives aux données sensibles (santé, durées de rétention, AIPD). |
| **Administrateur applicatif** | Rôle porté dans l'application elle-même (matrice RBAC), distinct des comptes techniques ci-dessous | Gestion des comptes utilisateurs, rôles, paramétrage — via l'interface d'administration de l'application, pas via les comptes de service. |
 
> Le président et le développeur ne sont pas nécessairement les seules personnes ayant un accès à terme (ex. un successeur au poste de mainteneur technique) — ce tableau doit être mis à jour à chaque changement de personne, pas seulement à chaque changement d'outil.
 
## 3. Registre des comptes de service
 
| Outil | Fonction | Titulaire (rôle « Owner ») | Accès Développeur | Accès quotidien requis pour le Développeur ? |
|---|---|---|---|---|
| **GitHub** (organisation du club) | Code source, gestion de projet, CI/CD, documentation versionnée | Président (Owner de l'organisation) | Rôle *Maintain* ou *Admin* sur le dépôt — jamais *Owner* de l'organisation | Oui |
| **Netlify** | Hébergement de l'application (PWA) | Président (Owner de l'équipe) | Rôle *Developer* | Oui |
| **Supabase** | Base de données, authentification, stockage fichiers | Président (Owner de l'organisation — facturation) | Rôle *Developer* (accès schéma, déploiement — pas facturation ni suppression d'organisation) | Oui |
| **Registrar du nom de domaine** | Propriété du nom de domaine du club | Président (titulaire exclusif) | Aucun accès permanent — sollicité ponctuellement pour le paramétrage DNS initial ou une modification technique | Non |
| **Brevo** (ou équivalent email transactionnel) | Envoi des emails de l'application (invitations, notifications) | Président (Owner) | Rôle *Membre* | Oui |
| *(à venir)* Vercel ou hébergeur du site vitrine Next.js | Hébergement du futur site public | Président (Owner) | Rôle développeur | Selon phase |
 
**Le nom de domaine est le point de vigilance n°1.** C'est l'angle mort le plus fréquent : un domaine acheté « pour aller plus vite » par le développeur devient de fait la clé de voûte du projet. Le domaine doit être enregistré directement par le président, dès le lancement, même avant que l'hébergement définitif soit choisi.
 
## 4. Procédure d'ajout d'un nouvel outil
 
Avant d'introduire tout nouvel outil ou service (même en freemium) :
 
1. Vérifier qu'un compte club (pas personnel) peut être créé.
2. Créer le compte sous l'email du président ou une adresse dédiée au club (ex. `contact@ascaribbean.fr` si elle existe), jamais sous une adresse personnelle.
3. Ajouter une ligne au tableau de la section 3 de ce document.
4. Documenter la raison du choix (voir les échanges de brainstorming d'architecture archivés dans le dépôt) pour qu'un futur repreneur comprenne le contexte de la décision, pas seulement l'outil retenu.
## 5. Procédure de révocation d'accès
 
En cas de départ du mainteneur technique (Développeur) ou de tout autre contributeur ayant un accès :
 
1. Le président révoque l'accès sur chaque outil listé en section 3 (retrait du compte de l'organisation/équipe — fonctionnalité native de chaque outil, pas de suppression de compte tiers).
2. Vérifier qu'aucun secret (clé API, mot de passe) connu de la personne sortante ne reste valide : régénérer les clés API Supabase, les tokens de déploiement Netlify, et tout token GitHub Actions si nécessaire.
3. Mettre à jour ce document (section 2 et 3) pour refléter le nouvel état.
4. S'assurer qu'un successeur (ou à défaut le président lui-même en mode minimal) dispose d'un accès *Maintain*/*Admin* sur le dépôt GitHub avant la révocation, pour ne jamais se retrouver sans accès technique du tout.
## 6. Documents liés
 
- `RETENTION-PURGE.md` — politique de rétention et de purge des données, stratégie d'archive froide.
- Les décisions d'architecture (choix de stack, arbitrages freemium) sont à conserver dans le dépôt, idéalement sous forme d'ADR (*Architecture Decision Records*) au fil de l'eau plutôt que de rester uniquement dans un historique de conversation.
## 7. Points ouverts
 
- Désignation du référent RGPD (cf. CDC section 22, décision n°5) — nécessaire avant de valider définitivement les durées de rétention du document `RETENTION-PURGE.md`.
- Adresse email dédiée au club (plutôt que l'email personnel du président) à créer si elle n'existe pas déjà, pour éviter que la titularité des comptes dépende elle-même d'une personne physique.