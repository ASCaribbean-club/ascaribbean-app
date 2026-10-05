# Spec — Vue mobile Trésorier : cotisations (`mobile-treasurer`)

> Statut : **rédaction initiale, 2026-10-05.** Un point ouvert **bloque la transmission à designer-agent** (PO-TR-01, périmètre d'écriture et de relance). Voir §6 et « Transmission ».
> Demande d'origine (développeuse) : un compte portant le rôle Trésorier obtient un tableau de bord mobile dédié pour voir toutes les cotisations. Le club n'a aujourd'hui qu'une seule section (qui contient les équipes) : **les filtres de section ne doivent pas être affichés** ; ils ne le sont que si **plus d'une section est représentée dans les données**.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module **P1 « Cotisations »**, matrice RBAC, exigences transversales §11.3 « modification paiement » / « export nominatif »), `docs/roles-personas-as-caribbean.md` (rôle Trésorier, comptes multi-rôles), `docs/GOUVERNANCE.md` (Brevo pour les e-mails applicatifs), `docs/RETENTION_PURGE.md` (données financières), `specs/web-memberships.md` (modèle adhésion/paiement, PO-WM-02/04/07/08), `specs/web-dashboard.md` (PO-WD-05/07), `specs/mobile-dirigeant-habilite.md` (patron « vue mobile d'un rôle club-wide », puces de section), `specs/menu.md` (Trésorier : aucune entrée financière dans le Menu), `specs/web-audit-logs.md`, `CLAUDE.md`.
> État du code lu : `src/domain/policies/{rbac-matrix,audit-actions}.ts`, `src/domain/entities/{payment,season}.ts`, `src/domain/rules/membership-payment-rules.ts`, `src/domain/repositories/{membership,payment}-repository.ts`, `src/domain/usecases/memberships/RecordPaymentUseCase.ts`, `src/presentation/app/providers/active-role-provider.tsx`, migrations `20260811171754_initial_schema.sql`, `20260917174652_web_memberships_write_policies.sql`, `20260930130959_audit_log_record_rpc.sql`.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe au §2 du registre pour cette feature.** Six exports PNG sont présents dans `docs/designs/treasurer/`, importés directement par la développeuse sans lien artifact : c'est le cas **`instantané seul`** du §4 du registre. **Aucun lien n'est à demander.** L'agent PO n'écrivant que dans `specs/`, la ligne est pré-rédigée ici, à recopier telle quelle (PO-TR-09) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| mobile-treasurer — **vue Trésorier : tableau de bord cotisations et liste des licenciés** (`[v5] [Trésorier] Mob - Cotisations {1..6}`) | — aucun lien fourni | 2026-10-05 | `docs/designs/treasurer/[v5] [Trésorier] Mob - Cotisations {1,2,3,4,5,6}.png` | **instantané seul** |

> Notes à joindre à la ligne. (a) **Six exports, deux écrans** : 1 et 2 sont **identiques au pixel près** (tableau de bord) ; 3 = liste « Cotisations », une ligne dépliée ; 4 = même liste, panneau de filtres ouvert sur « Impayées » ; 5 et 6 = mode sélection pour relance groupée (2 puis 3 sélectionnés). (b) **Toutes les maquettes montrent quatre sections dont « Basket »**, alors que le club n'en a qu'une et que `sections.type` n'admet pas de basket (déjà relevé par PO-DH-07) : les puces de section sont une illustration du cas multi-section, pas du cas actuel. (c) ⚠️ `docs/designs/treasurer/` est en `??` dans `git status` : à committer avec cette ligne.

## 1. Périmètre

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Lecture des cotisations, état payé/partiel/impayé, versements | **Cotisations** — « Tarification, échéancier, relance, export — sans encaissement en ligne » | **P1** |
| Tableau de bord par rôle | **Statistiques et exports** — « Tableaux de bord par rôle » | P1 |
| Relances (maquettes 1, 3–6) | **Cotisations** (relance) ; le canal relève de **Communication** — « notifications ciblées, préférences par canal » | P1 |

Comme pour `web-memberships`, **rien n'est encaissé** : « + Paiement » constaterait un paiement reçu hors application. Le paiement en ligne reste **P2**.

### Ce que les maquettes montrent

**Écran A — tableau de bord** (exports 1/2) : pastille de rôle « Trésorier », avatar, « Bonjour, {prénom} », ligne de contexte « Club entier · Saison {libellé} » ; rangée de puces de section (« Toutes » + une par section) ; carte « COTISATIONS ENCAISSÉES » (montant encaissé, « sur {total dû} », pourcentage, barre, « Reste à percevoir ») ; trois tuiles **Soldées / Partielles / Impayées** (comptes) ; bloc **« Par section »** (encaissé / dû · % par section, avec barre) ; bloc **« À relancer »** avec un lien « Gérer les cotisations », lignes nominatives (initiales, nom, « Reste {montant} », section · encaissé / dû, un bouton tronqué « Enc… ») ; bouton flottant `+` ; nav basse inchangée.

**Écran B — liste « Cotisations »** (exports 3/4) : en-tête de retour, sous-titre « Saison {libellé} · {encaissé} / {dû} encaissés », bouton « Sélection » ; recherche « Rechercher un licencié » ; panneau repliable **« Filtres »** — groupe **STATUT** (Tous · n / Impayées · n / Partielles · n / Soldées · n) et groupe **SECTION** (Toutes sections + une puce par section), lien « Réinitialiser » ; bandeau « {n} licenciés à relancer — {montant} restant · {n} sans relance depuis 7 j » + « Tout relancer » ; une carte par licencié (nom, pastille de statut, barre, encaissé / dû, section · reste, état de relance « Jamais relancé » / « 2 relances · dernière il y a 9 j », bouton « Relancer ») ; une carte **dépliée** montre **VERSEMENTS** (montant, date · **moyen « CB »**, bouton **« Modifier »**) et **« + Ajouter un paiement »** ; bouton flottant « + Paiement ».

**Écran C — mode sélection** (exports 5/6) : « Annuler » remplace « Sélection » ; consigne « Touchez les licenciés à relancer. Seuls ceux avec un reste dû sont affichés. » ; cases à cocher ; barre basse « {n} sélectionnés · Tout/Aucun · Relancer ».

### Entre au périmètre (ferme)

1. **Tableau de bord Trésorier** (écran A) en **lecture** : contexte, carte d'encaissement, trois tuiles, bloc « Par section » (sous réserve de PO-TR-04), liste des licenciés ayant un reste dû, lien vers la liste.
2. **Liste « Cotisations »** (écran B) en **lecture** : recherche par nom, filtre de statut, filtre de section (règle ci-dessous), carte par licencié, **dépliage montrant l'historique des versements** (montant, date de versement).
3. **Rôle actif Trésorier** : routage du tableau de bord pour un compte portant `treasurer`, bascule pour un compte multi-rôles.
4. **Règle d'affichage des filtres de section** (ci-dessous).

### Conditionné à PO-TR-01 (bloquant)

Tout ce que les maquettes montrent **en écriture ou en relance** n'est pas tranché par la demande (« voir toutes les cotisations ») :

- (a) **Enregistrer un paiement** (`+` du tableau de bord, « + Paiement », « + Ajouter un paiement », bouton « Enc… »). Le CDC le fonde (Trésorier titulaire du module), le modèle et le use case existent, mais il faut élargir `'payment:record'` et la RLS (§3).
- (b) **Modifier un paiement** (« Modifier ») et **moyen de paiement** (« CB ») : **aucun des deux n'existe** — `membership_payments` est append-only sans politique `update`, et n'a pas de colonne de moyen de paiement. C'est exactement **PO-WM-04**, toujours ouvert.
- (c) **Relances** : « Relancer », « Tout relancer », mode sélection (écran C), compteurs « Jamais relancé » / « n relances · dernière il y a n j » / « sans relance depuis 7 j ». **Rien n'existe** : ni table d'historique de relance, ni canal d'envoi (e-mail Brevo ? notification ? message ?), ni modèle de message, ni échéancier.

### Hors périmètre — explicitement

- **Encaissement en ligne** (P2), tout prestataire, formulaire de carte ou webhook.
- **Exports financiers** (matrice ✅ Trésorier « financier ») : aucun bouton d'export n'est montré.
- **Échéancier, tarification** (le montant dû reste saisi par l'administrateur au backoffice, `web-memberships`).
- **Données de dossier** : numéro de licence, statut d'adhésion, validité — le Trésorier est ❌ « financier seulement » sur les dossiers (§3).
- **Création, modification, archivage d'une adhésion** (`'membership:write'` reste `['admin']`).
- **Accès du Trésorier au backoffice** (`'backoffice:access'` inchangé).
- **Variantes Trésorier du Calendrier et des Actus** (PO-TR-06).

### Règle centrale — affichage des filtres de section

- **« Sections représentées »** = l'ensemble des **sections distinctes rattachées aux adhésions de la saison affichée** (rattachement : PO-TR-02), **pas** le nombre de lignes de `public.sections`. Une adhésion sans section rattachable ne compte pas comme une section.
- **0 ou 1 section représentée** : **aucun contrôle de filtre de section n'est rendu** — ni la rangée de puces du tableau de bord, ni le groupe « SECTION » du panneau de filtres, et le résumé du panneau ne mentionne pas les sections (« Tous statuts » seul).
- **2 sections représentées ou plus** : puces « Toutes » + une par section représentée sur le tableau de bord ; groupe « SECTION » dans le panneau de la liste.
- Le prédicat (« faut-il afficher le filtre de section ? ») est une **fonction pure du domaine**, testée par Vitest, consommée par les deux écrans — jamais un `length > 1` recopié dans chaque ViewModel.
- Ce filtre **n'est pas une frontière de sécurité** : il trie des données déjà autorisées, donc pas d'entrée de matrice (même position que `mobile-dirigeant-habilite` §1).
- Quand le filtre est visible et positionné sur une section, il restreint la carte d'encaissement, les tuiles, la liste « à relancer » et la liste ; le choix est partagé entre tableau de bord et liste, non persisté, « Toutes » par défaut.

## 2. Données et lectures

- **Saison** : la saison en cours désignée par Postgres (`current_season()`), jamais l'horloge du navigateur. Césure sans saison en cours : repli explicite, pas une liste vide muette (forme : PO-TR-08, même famille que PO-WM-07).
- **État de cotisation** : **réutiliser** `membershipPaymentStatus()` et `sumPaymentsCents()` (`domain/rules/membership-payment-rules.ts`) — une seule implémentation (AC-WM-12/13). Libellés maquette : Soldée = `paid`, Partielle = `partial`, Impayée = `unpaid`. Le cas `'undefined'` (montant dû absent ou nul) n'est pas illustré : PO-TR-03.
- **Montants** : entiers de centimes en base, formatés par `presentation/shared/formatters/currency.ts`.
- **Adhésions archivées** : exclues partout.
- **Section d'une adhésion** : `memberships` **ne porte aucune section**. Le seul chemin est `user_roles (role = 'player', team_id) → teams.section_id` sur la saison de l'adhésion. Un membre sans équipe n'a pas de section ; un membre joueur dans deux sections en a deux. Les maquettes montrent une seule section par ligne et des sommes « Par section » qui recomposent exactement le total : la règle de rattachement doit le garantir → **PO-TR-02**.
- **Le Trésorier ne peut aujourd'hui rien lire** : `memberships_select_own`, `membership_payments_select_own_or_admin`, `users_select_own` et `user_roles_select_own` ne l'admettent que pour sa propre ligne. Lecture proposée au §3.
- **Domaine** : nouveaux use cases dans `domain/usecases/` (un dossier dédié, créé par cette feature), sans import React/Supabase ; mapper obligatoire entre DTO et entité ; clés de requête centralisées et **distinctes** des clés admin (`/admin/memberships`) et de `profileMembership`.

## 3. RBAC

### Lignes de la matrice applicables au Trésorier

| Permission (matrice CDC) | Trésorier | Conséquence ici |
|---|---|---|
| Voir son propre profil/dossier | ✅ | En-tête, profil (inchangé) |
| Voir les dossiers des autres membres | ❌ **(financier seulement)** | Le Trésorier voit le **volet financier** de chaque licencié (nom, section, dû, encaissé, versements), **jamais** licence, statut d'adhésion, validité, coordonnées |
| Voir le statut de cotisation | ✅ | **Fonde** toute la lecture de cette feature, club-wide |
| Gérer échéanciers et relances | ✅ | Fonderait les relances — non construites tant que PO-TR-01(c) n'est pas tranché |
| Exporter des données | ✅ (financier) | Non exploité |
| Créer/modifier une convocation, évaluations, santé, communication ciblée, comptes/rôles, audit | ❌ | Aucun contrôle correspondant n'est rendu |

Le Trésorier est **club-wide** (`user_roles_scope_check` : ni `team_id` ni `section_id`) : aucune branche de portée n'est à ajouter dans `can.ts`.

### Lecture — RLS/RPC seule, **aucune entrée de matrice**

La lecture n'a pas d'entrée `can()` (critère de `rbac-matrix.ts` : `presentation/` rend ce que renvoie la lecture). Le routage vers le tableau de bord Trésorier passe par le **rôle actif**, comme pour le Dirigeant, pas par une action.

**Proposé et signalé** : une fonction **`security definer` étroite** (nom indicatif `get_treasurer_dues()`), qui vérifie elle-même `private.has_role('treasurer') or private.is_admin()` et lève `42501` sinon, **sans paramètre falsifiable**, bornée à la saison en cours et aux adhésions non archivées, et qui ne renvoie **que** : identifiant d'adhésion, nom affichable du membre, section(s) rattachée(s), montant dû, et les versements (ou leur somme + la liste à la demande). **Aucune colonne de dossier** (licence, statut, validité, e-mail). Même patron que `get_club_overview()` / `get_team_roster()`. Raison : ouvrir `memberships`, `users` et `user_roles` ligne à ligne au Trésorier lui donnerait le dossier entier, que la matrice lui refuse. **`memberships_select_own` n'est pas modifiée.**

### Écriture — **seulement si PO-TR-01(a) est accepté**, proposé et signalé

| Changement | Détail |
|---|---|
| `'payment:record'` | `['admin']` → **`['admin', 'treasurer']`**. Seule entrée de matrice touchée. Le commentaire `web-memberships` §3 de `rbac-matrix.ts` est à mettre à jour (répond en partie à **PO-WM-08**, option b) |
| RLS `membership_payments` | Nouvelle politique `membership_payments_insert_treasurer` : `with check (private.has_role('treasurer') and recorded_by = (select auth.uid()))`, commentée `'payment:record'`. Toujours **aucune** politique `update`/`delete` |
| Audit | `public.record_audit_log_entry` refuse aujourd'hui tout appelant non admin (`if not private.is_admin()`). `RecordPaymentUseCase` attrape l'échec et ne fait qu'un `console.error` : **un paiement saisi par un Trésorier ne serait pas tracé, silencieusement**. La fonction doit admettre le Trésorier **pour la seule action `membership.payment_recorded`** |

Aucune autre action, aucun autre rôle. `'membership:write'`, `'backoffice:access'`, `'audit:read'` inchangées. PO-TR-01(b) et (c) demanderaient d'autres entrées (correction de paiement, relance) : **non proposées tant qu'ils ne sont pas tranchés**.

### Comptes multi-rôles

- `DashboardRole` (présentation) et `ActiveDashboardRole` (`domain/rules/active-role-scope.ts`) gagnent `'treasurer'` **dans le même changement** (même règle qu'AC-DH-04).
- Un compte portant **uniquement** `treasurer` ouvre sur le tableau de bord Trésorier (aujourd'hui il tombe sur la vue Joueur, vide).
- Ordre de bascule par défaut : joueur → coach → dirigeant → trésorier (PO-TR-05).
- Trésorier + Dirigeant : deux vues distinctes, jamais fusionnées ; la vue Dirigeant reste sans donnée financière (AC-DH-25).
- Trésorier + Joueur : sa propre adhésion apparaît dans la liste au milieu des autres (déjà signalé par `web-memberships` §3) — PO-TR-10.
- Un contrôle non autorisé est **absent, jamais grisé**.

## 4. Données sensibles

| Nature | Cette feature | Conséquence |
|---|---|---|
| **Financière** | **Oui, c'est l'objet** : montants dus, encaissés, restes, versements datés, par personne | `RETENTION_PURGE.md` (données financières, conservation comptable) ; aucun montant en flottant |
| **Nominative** | **Oui** : liste club-wide nom + situation financière, sur téléphone | Projection minimale (§3), aucune donnée de dossier |
| **Santé** | Aucune | — |
| **Journal d'audit** | **Écriture** : « modification paiement » est listée au CDC §11.3 → si PO-TR-01(a), `membership.payment_recorded` doit être émis pour un Trésorier (§3, AC-TR-17). Si PO-TR-01(b), la correction d'un paiement est la « modification paiement » au sens strict. **Lecture** : le CDC ne trace que l'« export nominatif » ; tracer la consultation de cette liste est une question ouverte (PO-TR-07), jumelle de PO-WD-07 | Log métier depuis le use case, jamais depuis un composant ; un accès en lecture tracé serait un trigger/RPC Postgres |
| **Export** | Aucun | — |

Sécurité du compte : un téléphone ouvert sur la liste nominative des impayés du club est un risque concret ; la MFA n'est exigée que pour les administrateurs (signalé, hors périmètre).

## 5. Critères d'acceptation

Préfixe **`AC-TR-`**. AC-01/AC-02 (CDC §17.2) s'appliquent à la vue Joueur/Coach d'un compte multi-rôles.

**Accès et rôle actif**

| Réf. | Critère |
|---|---|
| AC-TR-01 | Un compte portant **uniquement** `treasurer` ouvre sur le tableau de bord Trésorier, jamais sur la vue Joueur ni un écran vide |
| AC-TR-02 | Un compte sans `treasurer` n'atteint jamais les écrans Trésorier, même en forçant le rôle actif ou l'URL de la liste |
| AC-TR-03 | `DashboardRole` et `ActiveDashboardRole` incluent `'treasurer'`, modifiés dans le même changement ; un compte multi-rôles bascule via la pastille de rôle |

**Lecture et sécurité**

| Réf. | Critère |
|---|---|
| AC-TR-04 | Avec un jeton Trésorier, contre la base : la fonction de lecture renvoie toutes les adhésions **non archivées** de la saison en cours, club-wide, et **aucune** colonne `licence_number`, `status`, `valid_until` ni e-mail. Avec un jeton Joueur, Coach, Dirigeant ou Responsable de section, elle lève une erreur |
| AC-TR-05 | Avec un jeton Trésorier, un `select` direct sur `memberships`, `users` ou `user_roles` ne renvoie toujours que ses propres lignes : aucune politique de ces tables n'a été élargie |
| AC-TR-06 | L'état Soldée / Partielle / Impayée provient de `membershipPaymentStatus()` ; aucun calcul parallèle dans un ViewModel ou un composant |

**Tableau de bord**

| Réf. | Critère |
|---|---|
| AC-TR-07 | La carte d'encaissement affiche : somme encaissée, total dû, pourcentage, reste à percevoir (= total dû − encaissé), sur la saison en cours. Les trois tuiles comptent les adhésions `paid` / `partial` / `unpaid` et leur somme égale le nombre d'adhésions de ces trois états |
| AC-TR-08 | La liste des licenciés à relancer ne contient que des adhésions avec un reste dû > 0, avec nom, reste, section (si représentée) et encaissé / dû. Le lien « Gérer les cotisations » ouvre la liste |
| AC-TR-09 | Sans saison en cours, un repli explicite est affiché (PO-TR-08) ; sans aucune adhésion, un état vide explicite ; jamais d'erreur ni de chargement infini |

**Filtres de section**

| Réf. | Critère |
|---|---|
| AC-TR-10 | Avec **0 ou 1** section représentée dans les adhésions de la saison, **aucun** filtre de section n'est rendu : ni puces sur le tableau de bord, ni groupe « SECTION » dans le panneau de filtres, ni mention des sections dans le résumé du panneau |
| AC-TR-11 | Avec **2 sections représentées ou plus**, les puces (« Toutes » + une par section représentée) et le groupe « SECTION » apparaissent, **sans changement de code**. Une section existant en base sans adhésion rattachée n'a pas de puce |
| AC-TR-12 | Le prédicat d'affichage est une fonction pure du domaine couverte par Vitest (cas 0, 1, 2 sections ; adhésions sans section), consommée par les deux écrans |
| AC-TR-13 | Une section choisie restreint la carte, les tuiles, la liste à relancer et la liste ; le choix est partagé entre tableau de bord et liste ; « Toutes » par défaut |

**Liste « Cotisations »**

| Réf. | Critère |
|---|---|
| AC-TR-14 | La recherche filtre par nom, insensible à la casse et aux accents ; le filtre de statut propose Tous / Impayées / Partielles / Soldées avec leurs comptes ; « Réinitialiser » remet statut (et section, si visible) aux valeurs par défaut |
| AC-TR-15 | Déplier une carte affiche l'historique des versements (montant, date de versement), du plus récent au plus ancien, et un état vide explicite sans versement. **Aucun moyen de paiement et aucun bouton « Modifier » ne sont rendus** tant que PO-TR-01(b) n'est pas tranché |
| AC-TR-16 | Tant que PO-TR-01 n'est pas tranché, **aucun** contrôle d'écriture ni de relance n'est rendu (`+`, « + Paiement », « Ajouter un paiement », « Relancer », « Tout relancer », « Sélection ») — absents, pas grisés |

**Écriture — seulement si PO-TR-01(a) accepté**

| Réf. | Critère |
|---|---|
| AC-TR-17 | `'payment:record'` vaut exactement `['admin', 'treasurer']` ; aucune autre action ni aucun autre rôle n'est ajouté. Un Trésorier enregistre un paiement via `RecordPaymentUseCase` inchangé (validations AC-WM-16) ; l'insertion réussit avec `recorded_by` = soi et échoue avec un tiers ; aucun `update`/`delete` n'est possible. **Une entrée `membership.payment_recorded` apparaît dans le journal d'audit** pour ce paiement (vérifié contre la base, pas seulement l'absence d'erreur) |
| AC-TR-18 | Après enregistrement, tableau de bord, liste, historique, ainsi que `/admin/memberships` et son badge, reflètent le paiement sans rechargement manuel (invalidation par clés centralisées) |

**Transverse**

| Réf. | Critère |
|---|---|
| AC-TR-19 | Aucun statut n'est porté par la couleur seule (pastilles textuelles « Soldée/Partielle/Impayée », montants en texte ; une barre seule ne suffit pas). Contrastes AA sur fond sombre |
| AC-TR-20 | En-tête de retour de la liste `sticky top-0` à fond opaque ; cibles ≥ `h-11` (puces comprises) ; `min-w-0` sur toute paire côte à côte ; vérifié sur un viewport mobile réel |
| AC-TR-21 | Aucun nom de personne des maquettes dans le code, les tests ou les fixtures (`CLAUDE.md` §9) |
| AC-TR-22 | Aucun import de `data/` depuis `presentation/` ; les ViewModels calculent les booléens (`showSectionFilter`, `canRecordPayment`) ; clés de requête dans `query-keys.ts` |
| AC-TR-23 | Non-régression : vues Joueur, Coach, Dirigeant, Menu, profil et `/admin/memberships` inchangés ; aucun export, aucune donnée de dossier ni de santé rendue |
| AC-TR-24 | Affichage du tableau de bord en moins de 3 s sur mobile pour un club de plusieurs centaines d'adhésions (une seule lecture agrégée, pas une requête par licencié) |

## 6. Points ouverts

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-TR-01** | **Périmètre d'écriture et de relance de cette passe.** La demande dit « voir » ; les maquettes montrent davantage. (a) Le Trésorier **enregistre-t-il des paiements** depuis le mobile ? (fondé par le CDC, modèle existant, demande l'élargissement du §3). (b) **Modifier un paiement** et **moyen de paiement** (« CB ») : dépend de PO-WM-04 (correction d'un paiement append-only, colonne de moyen de paiement), toujours ouvert. (c) **Relances** unitaires et groupées (écran C) : quel canal (e-mail Brevo, notification, autre), quel texte, faut-il un historique (« n relances · dernière il y a n j », « sans relance depuis 7 j »), qui peut relancer ? Rien n'existe en base ni en infrastructure | **Développeuse** (+ Bureau / Trésorier pour b et c) | **TRANCHÉ (2026-10-05) : lecture seule pour cette passe** — (a), (b), (c) hors périmètre, aucun contrôle d'écriture ni de relance rendu (AC-TR-16). Initialement bloquant : trois des six exports (3, 5, 6) et les boutons flottants des deux écrans en dépendent |
| **PO-TR-02** | **Rattachement d'une adhésion à une section.** `memberships` n'a pas de section. Défaut proposé : section de l'équipe où le membre est `player` dans la saison de l'adhésion. Que faire d'un membre **sans équipe** (« Sans section », visible sous « Toutes » seulement ?) et d'un membre joueur dans **deux sections** (compté dans les deux, au risque que « Par section » ne recompose plus le total ; ou une section principale — laquelle ?) | Développeuse / Bureau | **TRANCHÉ (2026-10-05) : défaut d'implémentation** — membre sans équipe regroupé sous « Sans section » (visible sous « Toutes » seulement) ; membre dans deux sections compté dans chacune, avec la réserve que « Par section » peut ne plus recomposer le total. Initialement : non pour la conception, oui pour l'implémentation de la fonction de lecture et de la règle d'affichage du filtre |
| PO-TR-03 | Adhésions à montant dû **absent ou nul** (`'undefined'`) : non illustrées. Défaut : même montant effectif que `/admin/memberships` (montant de l'adhésion, sinon tarif de saison) ; si toujours indéfini, l'adhésion apparaît sous « Tous » avec une mention neutre, hors des trois tuiles et hors du total dû. Hérite de PO-WM-02 | Développeuse / Trésorier | Non |
| PO-TR-04 | Le bloc **« Par section »** n'est pas un filtre, mais avec une seule section il ne fait que répéter la carte d'encaissement. Défaut : **masqué avec 0 ou 1 section représentée**, comme les filtres | Développeuse | Non |
| PO-TR-05 | Ordre de bascule de la pastille : défaut joueur → coach → dirigeant → trésorier | Développeuse | Non |
| PO-TR-06 | Nav basse : **Calendrier** et **Actus** pour la vue Trésorier (le Trésorier n'a pas d'équipe ; même dette que PO-CA-06 / PO-MN-07). Défaut : écrans existants inchangés, aucune variante Trésorier dans cette passe | Développeuse | Non |
| PO-TR-07 | Faut-il **journaliser la consultation** de la liste nominative des impayés depuis un mobile ? Le CDC ne trace que l'export nominatif. Jumelle de PO-WD-07 | Référent RGPD / Bureau | Non pour construire, **à trancher avant mise en production** |
| PO-TR-08 | Repli quand aucune saison n'est en cours (dernière saison ? message ?). Même famille que PO-WM-07 / PO-WD-05 ; et faut-il montrer les impayés d'une saison **passée** ? Défaut : saison en cours seulement, message explicite en césure | Développeuse / Trésorier | Non |
| PO-TR-09 | Recopier la ligne du §0 dans `DESIGN_LINKS.md` et committer `docs/designs/treasurer/` | Designer-agent / développeuse | Non |
| PO-TR-10 | Trésorier + Joueur : sa propre adhésion figure dans la liste qu'il gère. Acceptable tel quel ? Défaut : oui, sans traitement particulier | Développeuse / Bureau | Non |

**Points reconduits, non rouverts** : PO-WM-02 (cas limites de l'état), PO-WM-04 (correction de paiement, moyen de paiement), PO-WM-08 (rôles du module Cotisations — **partiellement résolu** par cette feature si PO-TR-01(a) est accepté), PO-AU-03 (rétention du journal).

## 7. Note pour designer-agent (après levée de PO-TR-01)

- Maquettes : `docs/designs/treasurer/[v5] [Trésorier] Mob - Cotisations {1..6}.png`, statut `instantané seul`, **ne pas demander de lien**. Les exports 1 et 2 sont identiques.
- Patrons à réutiliser : en-tête et `Pill` de rôle du tableau de bord Dirigeant/Coach, puces `ToggleGroup` du tableau de bord Dirigeant, `BackHeader` sticky, `MembershipCotisationSummary` / `PaymentHistoryList` / `RecordPaymentDialog` du backoffice comme référence de contenu.
- **Ne pas concevoir** : puce « Basket » ni liste de sections figée ; filtres de section quand ≤ 1 section représentée ; numéro de licence, statut d'adhésion, validité ; export ; tout contrôle d'écriture ou de relance non retenu par PO-TR-01.
- Le bouton « Enc… » tronqué de l'export 1 est masqué par le `+` flottant : son libellé exact n'est pas lisible et ne doit pas être deviné.

## Transmission

**Prêt pour transmission à designer-agent : OUI (PO-TR-01 tranché : lecture seule ; PO-TR-02 : défaut d'implémentation).** Ancien statut : non. **PO-TR-01 bloque** : tant que la développeuse n'a pas dit si cette passe couvre l'enregistrement de paiement, la modification de paiement et les relances, la moitié des exports (liste dépliée avec « Modifier », mode sélection, boutons flottants) ne peut être ni conçue ni écartée. Les écrans en lecture seule (tableau de bord, liste, filtres, historique) sont entièrement spécifiés et pourraient être conçus seuls si la développeuse choisit « lecture seule pour cette passe ».

PO-TR-02 ne bloque pas la conception mais **bloque l'implémentation** de la lecture (rattachement à une section). PO-TR-07 est à trancher avant la mise en production.

## UI design

> Passe **lecture seule** (PO-TR-01 tranché). Références ouvertes : `docs/designs/treasurer/[v5] [Trésorier] Mob - Cotisations 1.png` (= 2, tableau de bord), `… 3.png` (liste, carte dépliée), `… 4.png` (panneau de filtres). Les exports 5 et 6 (mode sélection / relance) sont **écartés**. Registre : ligne `instantané seul` du §0 à recopier dans `docs/designs/DESIGN_LINKS.md` (PO-TR-09) ; aucun lien à demander. Aucun nouveau patron visuel n'est introduit : tout est une variation de composants existants, donc pas de pause « prototype Claude Design ».

### Emplacement dans la navigation

- Nav basse inchangée (Dashboard / Calendrier / Actus / Menu), pour tous les rôles, aucune entrée ajoutée.
- **Tableau de bord Trésorier** = écran **Dashboard** pour le rôle actif `treasurer` (même emplacement que les vues Joueur / Coach / Dirigeant, bascule par la pastille de rôle).
- **Liste « Cotisations »** = sous-écran de la destination **Dashboard**, atteint par le lien du bloc « Restes dus » ; l'onglet Dashboard reste actif. Aucune entrée dans le **Menu** (`specs/menu.md` : pas d'entrée financière pour le Trésorier). Calendrier / Actus : écrans existants inchangés (PO-TR-06).

### Par rôle (voir §3, non redéfini ici)

- **Trésorier actif (ou admin portant le rôle)** : les deux écrans ci-dessous. Lecture via la RPC étroite du §3, donc l'écran ne montre jamais licence, statut d'adhésion, validité, e-mail.
- **Autres rôles / compte sans `treasurer`** : aucun accès, aucune entrée visible (AC-TR-02). Pas de contrôle grisé.
- **Compte multi-rôles** : pastille de rôle existante, « Trésorier » ajouté en dernier (PO-TR-05). Les vues restent distinctes.
- **Aucun contrôle d'écriture ni de relance n'est rendu** (AC-TR-16) : pas de bouton flottant `+` / « + Paiement » (ni sur le tableau de bord, ni sur la liste), pas de « Enc… », « Relancer », « Tout relancer », « Sélection », « + Ajouter un paiement », « Modifier », pas de moyen de paiement (« CB »), pas d'état de relance (« Jamais relancé », « n relances… »). Pas d'export.

### Écran A — Tableau de bord Trésorier (reprend `Cotisations 1.png`)

De haut en bas :

1. **En-tête** : pastille de rôle « Trésorier » (même composant que Dirigeant/Coach, `docs/designs/authorized-officer/[v4] [Dirigeant] Mob - Dashboard.png`), avatar, « Bonjour, {prénom} », contexte « Club entier · Saison {libellé} ».
2. **Puces de section** (« Toutes » + une par section représentée) : même `ToggleGroup` que le Dirigeant, défilement horizontal, puce `h-11`. **Rendues uniquement si le prédicat de domaine `showSectionFilter` est vrai (2+ sections distinctes représentées)** ; sinon la rangée disparaît entièrement et la carte d'encaissement monte. Aucune puce « Sans section » : ces membres ne sont visibles que sous « Toutes ». Choix partagé avec la liste, non persisté.
3. **Carte « COTISATIONS ENCAISSÉES »** : montant encaissé, « sur {total dû} », pourcentage, barre de progression, « Reste à percevoir : {montant} ». Le pourcentage et le reste sont en texte (AC-TR-19).
4. **Trois tuiles** Soldées / Partielles / Impayées (compte + libellé texte), `grid-cols-3`, **`min-w-0` sur chaque tuile** pour qu'elles rétrécissent à leur colonne sur petit écran ; la tuile entière n'est pas interactive (pas de filtre par tuile dans cette passe).
5. **Bloc « Par section »** : une ligne par section représentée (nom, « encaissé / dû · % », barre). **Masqué si `showSectionFilter` est faux** (PO-TR-04). Les membres sans équipe y figurent sur une dernière ligne « Sans section » (visible seulement avec « Toutes »). Dans la ligne, le bloc montants a `min-w-0` + troncature, le nom ne passe jamais à la ligne sous le montant. Note de lecture : un membre dans deux sections compte dans chacune, la somme peut dépasser le total (PO-TR-02) ; pas de mention à l'écran.
6. **Bloc « Restes dus »** (remplace « À relancer », libellé qui annonce une relance non construite) : lien « Voir les cotisations » (remplace « Gérer les cotisations », verbe d'écriture) vers la liste, cible `h-11`. Lignes : initiales, nom, « Reste {montant} », « {section si visible} · {encaissé} / {dû} », barre. Adhésions avec reste > 0 seulement, les plus gros restes d'abord, **plafonnées à quelques lignes** (valeur au développement, ex. 5) avec le lien vers la liste pour le reste. **Lignes non interactives** (le bouton « Enc… » et le `+` flottant disparaissent, ce qui supprime aussi le chevauchement visible sur l'export 1).
7. **États** : chargement (squelette des cartes) ; sans saison en cours, message explicite (PO-TR-08) ; sans adhésion, état vide explicite ; erreur avec « Réessayer » (AC-TR-09). Jamais de chargement infini.

### Écran B — Liste « Cotisations » (reprend `Cotisations 3.png` et `4.png`)

1. **En-tête `sticky top-0`, fond opaque** (`BackHeader`) : flèche de retour `h-11 w-11`, titre « Cotisations », sous-titre « Saison {libellé} · {encaissé} / {dû} encaissés ». **Pas de bouton « Sélection »** : le titre prend toute la largeur (`min-w-0`, sous-titre tronqué en deux lignes max). La recherche et le panneau de filtres restent dans le flux (non sticky) pour ne pas manger la hauteur utile.
2. **Recherche** « Rechercher un licencié » : `Input` `h-11`, insensible casse/accents (AC-TR-14).
3. **Panneau repliable « Filtres »** : déclencheur pleine largeur `h-11`, résumé du filtre actif à droite (« Tous statuts », ou « Impayées »). Replié par défaut.
   - Groupe **STATUT** : puces `Tous · n`, `Impayées · n`, `Partielles · n`, `Soldées · n`, `h-11`, retour à la ligne (`flex-wrap`), une seule sélection.
   - Groupe **SECTION** (« Toutes sections » + une puce par section représentée) : **rendu seulement si `showSectionFilter`**. Sinon le groupe est absent et le résumé ne parle que du statut (« Tous statuts », jamais « Toutes sections »).
   - Lien « Réinitialiser » (cible `h-11`) : remet statut à « Tous » et section à « Toutes » si visible.
   - Les comptes de statut tiennent compte du filtre de section et pas de la recherche.
4. **Bandeau de synthèse** (remplace « {n} licenciés à relancer… + Tout relancer ») : « {n} licenciés avec un reste dû — {montant} restant », **sans bouton ni mention de relance**, style neutre/ambre discret du bandeau existant. Absent si n = 0.
5. **Carte de licencié** (une par adhésion, tri : reste dû décroissant puis nom) : initiales, nom, pastille de statut texte (Soldée / Partielle / Impayée), barre, « {encaissé} / {dû} », ligne secondaire « {section si visible, ou « Sans section » si visible} · reste {montant} » (reste omis si soldée). **Aucune ligne de relance, aucun bouton.**
   - **Dépliage** : toute la zone d'en-tête de carte est la cible (`h-11` minimum, chevron indicatif), un seul geste. Pliée par défaut ; plusieurs cartes peuvent être ouvertes. Chevron et `aria-expanded`.
   - **Contenu déplié** : titre « VERSEMENTS » ; une ligne par versement, du plus récent au plus ancien : montant (gras) et date longue (« 12 septembre 2026 »), **sans moyen de paiement ni bouton « Modifier »** (AC-TR-15). Sans versement : « Aucun versement enregistré ». Pas de « + Ajouter un paiement ».
   - Montants et statuts toujours en texte, jamais par la couleur seule (AC-TR-19).
6. **États** : chargement (squelettes de cartes) ; aucun résultat de recherche/filtre (« Aucun licencié ne correspond », avec lien « Réinitialiser ») ; aucune adhésion ; sans saison ; erreur avec « Réessayer ». Pas de bouton flottant, donc plus de carte masquée en bas de liste ; garder une marge basse pour la nav.

### Composants nouveaux (variations, pas de nouveau patron)

- `ShowSectionFilter` : prédicat de domaine, déjà décrit au §1, pas un composant ; les deux écrans lisent le booléen du ViewModel.
- **Carte de licencié dépliable** : variation de la carte compacte existante + patron « liste dépliable » (cf. convocations « N total, plus récente dépliée », ici tout replié par défaut car l'objet est la consultation de nombreux licenciés). Contenu de versements : référence de contenu `PaymentHistoryList` du backoffice, sans actions.
- **Barre de progression + pastille de statut** : réutilisation des barres du tableau de bord (`Cotisations 1.png`) ; contraste AA sur fond sombre.
- Tous les contrôles (puces, déclencheurs, `Input`, flèche de retour, lien « Voir les cotisations ») : `h-11` explicite, pas le `h-8` shadcn par défaut ; `min-w-0` sur toute paire côte à côte (tuiles, nom/montant) ; à vérifier à un viewport mobile réel (AC-TR-20).

### Points ouverts UI (aucun bloquant)

| Réf. | Question | Défaut proposé |
|---|---|---|
| UI-TR-01 | Libellés lecture seule : « Restes dus » au lieu de « À relancer » et « Voir les cotisations » au lieu de « Gérer les cotisations » (les maquettes les écrivent pour la version avec relance). OK ? | Oui, à rétablir si les relances sont ajoutées |
| UI-TR-02 | Ligne « Sans section » dans « Par section » (le §PO-TR-02 dit « visible sous Toutes seulement », ce qui couvre aussi ce bloc puisqu'il n'est affiché que sous « Toutes » ; mais est-elle voulue ?) | Oui, en dernière ligne, pour que le bloc recompose le total des membres sans équipe |
| UI-TR-03 | Tap sur une ligne de « Restes dus » : rien, ou ouvrir la liste avec la recherche préremplie sur ce nom ? | Rien dans cette passe |
| UI-TR-04 | Plafond de lignes du bloc « Restes dus » sur le tableau de bord | 5 |
| UI-TR-05 | Vide-t-on l'espace laissé par l'absence des boutons flottants / tuiles cliquables en filtrant la liste par tuile (tuile Impayées → liste filtrée) ? | Non dans cette passe |

**Question bloquante : aucune.** Rappels : PO-TR-02 bloque l'implémentation de la lecture mais pas cette conception ; PO-TR-07 est à trancher avant la production.

## Amendement du 2026-10-05 — accès à la liste (décision développeuse)

Remplace, là où ils divergent, le §3 « Lecture — RLS/RPC seule, aucune entrée de matrice », AC-TR-02 et le libellé UI-TR-01.

- **Accès à la liste « Cotisations »** : (1) par le lien **« Gérer les cotisations »** du bloc « Restes dus » du tableau de bord Trésorier (libellé de la maquette rétabli ; UI-TR-01 caduc pour ce lien) ; (2) par une **carte « Cotisations » du Menu** (section « Club & administration »), route `/dues`.
- **Dirigeant habilité en lecture seule** : le `authorized-officer` voit la même liste, en **lecture seule**. Son tableau de bord Dirigeant reste sans donnée financière (AC-DH-25) ; il n'accède aux cotisations que par la carte du Menu. **Aucun contrôle d'écriture ni de relance** n'est rendu, ni pour lui ni pour le Trésorier (AC-TR-16 inchangé).
- **Nouvelle entrée de matrice (à signaler)** : `'dues:read': ['treasurer', 'authorized-officer', 'admin']`. Elle est justifiée par le critère de `rbac-matrix.ts` : le Menu doit afficher ou masquer une carte avant toute requête. Club-wide, aucune branche de portée dans `can.ts`. Aucune entrée d'écriture.
- **Miroir SQL** : `get_treasurer_dues()` admet désormais `private.has_role('treasurer') or private.has_role('authorized-officer') or private.is_admin()` (commenté `dues:read`, migration `20261005130000_get_treasurer_dues_rpc.sql`, non appliquée). Aucune politique de table n'est élargie : l'officier ne lit toujours ni `memberships`, ni `users`, ni `user_roles` ligne à ligne, et la fonction ne renvoie aucune colonne de dossier.
- **AC-TR-02 (révisé)** : un compte sans `treasurer`, `authorized-officer` ni `admin` n'atteint ni le tableau de bord Trésorier (rôle actif réellement porté) ni la liste (`can('dues:read')` + refus de la fonction).
- **AC-TR-25** : la carte « Cotisations » du Menu est absente (jamais grisée) sans `dues:read` ; le lien « Gérer les cotisations » ouvre la liste.
- **AC-TR-26** : avec un jeton Dirigeant habilité, la fonction de lecture renvoie les mêmes lignes qu'avec un jeton Trésorier ; avec un jeton Joueur, Coach ou Responsable de section, elle lève une erreur (complète AC-TR-04).

## Amendement du 2026-10-05 (2) — moyen de paiement

- Décision développeuse : chaque paiement porte un **moyen de paiement** parmi **CB, Virement, Autre** (`'card' | 'transfer' | 'other'`). Ni espèces ni chèque : le CDC et cette spec ne les demandent pas.
- **Référentiel constant** dans le domaine (`domain/entities/payment-method.ts`, `PAYMENT_METHODS` + garde `isPaymentMethod`), sans table de référence ; libellés français dans `presentation/shared/formatters/payment-method-labels.ts`. En base : colonne `membership_payments.payment_method` en TEXT, **nullable** (lignes existantes), contrainte CHECK recopiée à la main (migration `20261005140000_payment_method.sql`, non appliquée), commentée des deux côtés.
- `get_treasurer_dues()` renvoie le moyen par versement (même migration : suppression puis recréation, le type de retour ne changeant pas de colonnes mais le contenu JSON oui ; règle `dues:read` inchangée).
- **Liste « Cotisations »** : l'historique des versements affiche « {date} · {moyen} » ; moyen nul = rien d'affiché. Aucun bouton « Modifier » (AC-TR-15 réduit : seul le bouton disparaît du périmètre, le moyen est désormais rendu).
- **Saisie** : le dialogue admin d'enregistrement de paiement existant gagne un select optionnel « Moyen de paiement » (`h-11`, « Non précisé » par défaut) ; `RecordPaymentUseCase` le valide contre le référentiel et le persiste. Aucune nouvelle entrée de matrice.
- **Portée vis-à-vis des points ouverts** : cela ne résout que la partie « moyen de paiement » de PO-TR-01(b) / PO-WM-04. La **correction d'un paiement** (modification, suppression) reste ouverte et non construite ; les relances aussi.
