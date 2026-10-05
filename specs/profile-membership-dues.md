# Spec — Profil : cotisation du membre et lien de paiement (`profile-membership-dues`)

> Statut : **rédaction initiale, 2026-10-05.** Un point ouvert **bloque la transmission à designer-agent** : PO-PMD-01 (registre des maquettes, une seule réponse de la développeuse suffit). Voir §6 et « Transmission ».
> Demande (développeuse) : sur « Mon profil », dans le bloc **Adhésion**, ajouter une ligne **Cotisation** dépliable qui montre l'historique de ses propres versements ; sous cette ligne, si la cotisation **n'est pas soldée**, un **lien de paiement** que le membre peut toucher pour payer.
> Décisions développeuse reprises telles quelles : (1) le lien est une **URL par saison**, stockée en base, saisie par l'administrateur sur la saison (colonne + champ de backoffice minimal) ; **simple renvoi externe**, aucun parcours de paiement dans l'application. (2) Ligne repliée : « Cotisation · {versé} € / {dû} € » + pastille **Soldée / Partielle / Impayée** ; ligne dépliée : **ses propres** versements (date, montant, libellé du moyen de paiement s'il existe), du plus récent au plus ancien. Données du membre lui-même uniquement.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P1 « Cotisations — sans encaissement en ligne (7.2) », P2 « Paiement en ligne intégré », matrice RBAC, §11.3), `docs/roles-personas-as-caribbean.md`, `docs/RETENTION_PURGE.md`, `specs/profile-page.md` (§1-§3, AC-PR-10, addendum §7), `specs/mobile-treasurer.md` (amendements (2) moyen de paiement, (3) enregistrement, (4) relances et bandeau membre, AC-TR-18/39/43), `specs/web-seasons.md` (§2.5, §2.7, AC-WS-31/35), `specs/web-memberships.md` (PO-WM-02).
> Code lu : `src/presentation/features/profile/{useProfileViewModel.ts,components/MembershipSection.tsx}`, `src/presentation/shared/query-keys.ts` (`profileMembership`, `profileAll`), `src/domain/usecases/profile/GetProfileMembershipUseCase.ts`, `src/domain/rules/membership-payment-rules.ts`, `src/domain/entities/{payment,season}.ts`, `src/domain/repositories/payment-repository.ts`, `src/domain/usecases/seasons/UpdateSeasonUseCase.ts`, `src/domain/policies/{rbac-matrix,audit-actions}.ts`, migrations `20260811171754_initial_schema.sql`, `20260917174652_web_memberships_write_policies.sql`, `20260918075726_seasons_cotisation_amount_column.sql`, `20260917122358_web_seasons_write_policies.sql`.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

- **Aucune ligne n'existe pour cette feature.** Les deux lignes `profile-page` (liens `actif`) portent sur l'écran de profil d'origine, pas sur ce bloc.
- `docs/designs/profile-page/[v4] [Joueur] Mob - Profil.png` et `… [v4] [Coach] Mob - Profil.png` existent dans le dépôt (non référencés au registre). L'export joueur montre un bloc « ADHÉSION » **sans aucune ligne de cotisation** : rien dans les maquettes existantes ne couvre cette feature.
- Selon le §4 du registre, la question se pose **une seule fois** à la développeuse : PO-PMD-01. Ligne pré-rédigée pour le cas le plus probable (aucune maquette), à recopier une fois la réponse obtenue :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| profile-membership-dues — **ligne « Cotisation » dépliable + lien de paiement dans le bloc Adhésion du profil** | — aucune maquette produite (conçu par composition à partir de `MembershipSection` et de la carte dépliable `DueCard` du Trésorier, ne plus redemander) | 2026-10-05 | N/A | **absent** |

## 1. Périmètre

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Statut de sa propre cotisation, historique de ses versements | **Cotisations** (matrice : « Voir le statut de cotisation ✅ (soi-même) ») | **P1** |
| Lien de paiement **externe** | **Cotisations** — « sans encaissement en ligne (7.2) » ; « Paiement en ligne intégré » reste **P2** | P1 (renvoi seulement) |
| Champ « lien de paiement » de la saison | Paramétrage admin (`web-seasons`, `'season:write'`) | P1 |

Un lien externe n'est pas un « paiement en ligne intégré » : l'application **n'encaisse rien**, ne reçoit aucun retour du prestataire et ne change aucun statut d'elle-même. Le versement n'apparaît au profil qu'une fois **enregistré à la main** par le Trésorier ou l'administrateur (`RecordPaymentUseCase`, inchangé). Le fait que le club accepte un paiement par une plateforme externe relève du Bureau (PO-PMD-03).

### Entre au périmètre

1. **Ligne « Cotisation »** dans le bloc Adhésion du profil, **pour la seule adhésion affichée** (saison en cours, non archivée, celle que `GetProfileMembershipUseCase` résout déjà).
   - Repliée : « Cotisation · {versé} € / {dû} € » + pastille texte Soldée / Partielle / Impayée.
   - Dépliée : liste de **ses** versements, plus récent d'abord ; chaque ligne : date du versement, montant, libellé du moyen de paiement **s'il existe** (rien si `null`).
2. **Lien de paiement**, sous la ligne Cotisation, rendu **seulement si** : statut `unpaid` ou `partial` **et** la saison porte une URL de paiement.
3. **Colonne `seasons.payment_url`** (§2.2) et sa validation dans le domaine.
4. **Champ backoffice minimal** : un champ facultatif « Lien de paiement » dans le dialogue de création/modification de saison existant (`SeasonFormDialog`). Rien d'autre côté backoffice.

### Hors périmètre (non-objectifs)

- **Tout parcours de paiement dans l'application** : formulaire de carte, iframe, webhook, retour du prestataire, rapprochement automatique, changement de statut au retour du lien. Le paiement en ligne intégré reste P2.
- **Toute écriture par le membre** : déclarer un paiement, téléverser un justificatif, modifier ou contester un versement. Correction d'un versement : PO-WM-04, toujours ouvert.
- **Relances et bandeau de rappel** : `specs/mobile-treasurer.md` amendement (4), inchangé. Le bandeau **ne reçoit pas** le lien de paiement (AC-TR-39 inchangé, PO-PMD-06).
- **Vue Trésorier / Dirigeant / admin** : liste « Cotisations », `/admin/memberships`, inchangées. Pas de lien de paiement chez eux.
- **Lien personnalisé par membre** (paramètres pré-remplis : nom, montant, identifiant) : non. Une URL par saison, rendue telle quelle (PO-PMD-05).
- **Saisons passées, adhésions archivées** : non affichées (même borne que le bloc Adhésion actuel).
- **Colonne « lien » dans la liste des saisons** du backoffice : non (AC-WS-35 inchangé, quatre colonnes).
- **Échéancier, tarification par section ou catégorie, export.**

### Amendements à des specs existantes (à reporter par un amendement daté dans chaque fichier ; l'agent PO ne les modifie pas ici)

| Spec | Élément | Amendement |
|---|---|---|
| `specs/profile-page.md` | **AC-PR-10** | **Remplacé** : « Aucune donnée financière **d'un tiers** n'apparaît. La **seule** donnée financière rendue est la cotisation **du compte connecté lui-même** (statut, montant dû, montant versé, ses versements et leur moyen de paiement), pour la saison en cours, telle que décrite dans `specs/profile-membership-dues.md`. Aucun échéancier, aucune relance, aucun montant d'un autre membre, **y compris pour un jeton Trésorier**. » |
| `specs/profile-page.md` | §1 « Hors périmètre » (« Le statut de cotisation »), §2 ligne Trésorier (« Aucune donnée financière n'est rendue pour autant »), §3 « Données financières — aucune », §6 (« statut de cotisation, solde, échéancier — AC-PR-10 » parmi les blocs à écarter), §7 « AC-PR-10 reste intact » | Caducs pour la seule cotisation **propre** du compte. Le reste de ces paragraphes est inchangé |
| `specs/mobile-treasurer.md` | **AC-TR-43**, dernière phrase (« aucune donnée financière sur le profil (AC-MN-06 et AC-PR-10 inchangés) ») et §H (« AC-PR-10 (profile-page) restent inchangés ») | Le profil affiche désormais la cotisation propre du membre. Le **bandeau** reste sans lien de paiement ni versements (AC-TR-39 inchangé) ; AC-MN-06 (Menu) inchangé |
| `specs/web-seasons.md` | §2.1 (« exactement une colonne » ajoutée), **AC-WS-31** | Une **deuxième** colonne nouvelle, `payment_url` : donnée de **configuration**, ni nominative ni financière au sens de RETENTION (§4). AC-WS-35 (quatre colonnes dans la liste) inchangé |

## 2. Données et lectures

### 2.1 Lecture côté membre : RLS existante, aucune politique nouvelle

| Donnée | Source | Politique déjà en place |
|---|---|---|
| Adhésion de la saison en cours (`amount_due_cents`) | `memberships` | `memberships_select_own` (sa ligne, non archivée) |
| Ses versements (`amount_cents`, `paid_at`, `payment_method`) | `membership_payments` via `PaymentRepository.listForMembership` (existe) | `membership_payments_select_own_or_admin` (ligne dont l'adhésion parente est à lui et non archivée) |
| Tarif de saison (`cotisation_amount`) et lien (`payment_url`) | `seasons` | `seasons_select_authenticated` (`using (true)`) |

**Réponse à la question « un membre lit-il déjà ses propres versements ? » : oui.** La politique a été posée par `web-memberships` (« calquée sur celle du parent ») précisément pour ce cas, sans écran consommateur jusqu'ici. **Aucune migration RLS n'est requise.**

**Choix lecture par politique vs fonction de lecture, signalé :**

- **Retenu : politiques de table existantes + repository existant.** C'est une lecture « sa propre ligne », que le critère de `rbac-matrix.ts` classe comme RLS seule. La politique existe déjà, est testable par appel direct et couvre l'archivage.
- **Écarté : une fonction `security definer` (ex. `get_my_dues()`).** Elle dupliquerait une règle déjà portée par la RLS et ajouterait une surface `security definer` sans besoin. Elle ne se justifierait que pour **masquer des colonnes**, voir la réserve ci-dessous.
- **Réserve, signalée et non corrigée ici** : la politique de ligne expose au membre, par appel direct à l'API, les colonnes `recorded_by` (UUID du compte qui a saisi le versement) et `recorded_at` de ses propres versements. C'est un identifiant opaque, pas un nom (aucune lecture de `users` d'un tiers n'est ouverte). L'écran **ne les rend pas**. Si le référent RGPD juge cet UUID problématique, la correction serait une vue ou une fonction de projection (PO-PMD-07). Situation **antérieure** à cette feature (depuis `20260917174652`).

### 2.2 Nouvelle colonne `seasons.payment_url` (proposée, signalée ; migration à écrire, **non appliquée**)

| Élément | Valeur proposée | Pourquoi |
|---|---|---|
| Colonne | `payment_url text` | URL de la page de paiement de la cotisation de cette saison |
| Nullabilité | **nullable**, pas de défaut | Une saison sans lien est un cas normal : le lien est alors simplement absent du profil |
| Contrainte | `check (payment_url is null or (payment_url ~* '^https://[^[:space:]]+$' and char_length(payment_url) <= 2048))` | Refuse `http:`, `javascript:`, `data:` et toute valeur vide ou avec espaces. **Miroir SQL** de la validation du domaine, commenté des deux côtés (`CLAUDE.md` §7) |
| Lecture | Hérite de `seasons_select_authenticated` | Ce n'est pas une donnée nominative : même raisonnement que le tarif de saison (`web-seasons` §3, note de lecture) |
| Écriture | Hérite de `seasons_insert_admin` / `seasons_update_admin` | Aucune politique nouvelle. Comme les autres colonnes, la valeur est **figée une fois la saison terminée** (`end_date >= current_date` dans la politique `update`). Sans effet ici : le profil ne montre que la saison en cours |

- **Domaine** : `Season.paymentUrl: string | null` ; `SeasonRow` + mapper mis à jour (mapper obligatoire). `CreateSeasonUseCase` / `UpdateSeasonUseCase` acceptent `paymentUrl`, normalisent la chaîne vide ou blanche en `null`, et lèvent `InvalidSeasonInputError` si la valeur n'est pas une URL `https:` valide (analyse par le constructeur `URL` standard, aucune dépendance navigateur) ou dépasse 2 048 caractères.
- **Backoffice** : un champ `Input` « Lien de paiement (facultatif) » dans `SeasonFormDialog`, `type="url"`, pré-rempli en modification, vide sinon. Message d'erreur français dans `mapDomainErrorToUiError`. **Aucune** colonne ajoutée à la liste des saisons, **aucun** autre écran.
- **Audit** : la modification passe par `UpdateSeasonUseCase`, qui émet déjà `season.updated`. Aucun nouveau code d'audit (voir §4 et PO-PMD-08).

### 2.3 Règles (domaine, réutilisées, aucune nouvelle formule)

- **Montant dû effectif** : `effectiveAmountDueCents(membership.amountDueCents, season.cotisationAmount)`, la même règle que le Trésorier (PO-TR-03). Jamais une seconde formule.
- **Versé** : `sumPaymentsCents(payments)`. **Statut** : `membershipPaymentStatus(versé, dû)`. Libellés : `paid` = Soldée, `partial` = Partielle, `unpaid` = Impayée (mêmes libellés que la liste Trésorier).
- **Visibilité du lien** : une fonction pure du domaine, nom indicatif `shouldShowDuesPaymentLink(status, paymentUrl)`, vraie si et seulement si `status ∈ {'unpaid', 'partial'}` **et** `paymentUrl !== null`. Testée par Vitest. Le ViewModel expose le booléen ; la Page ne compare rien.
- **Cas `'undefined'`** (montant dû absent ou ≤ 0) : la ligne Cotisation s'affiche avec le versé seul et une mention neutre, **sans pastille de statut colorée et sans lien** (défaut, PO-PMD-04).
- **Trop-perçu** (`versé > dû`) : `paid`, donc Soldée, pas de lien. Les montants affichés sont les vrais montants.
- **Ordre de l'historique** : `paid_at` décroissant, puis `recorded_at` décroissant à date égale (ordre déjà porté par `listForMembership`, à vérifier pour le départage).
- **Dates** : `paid_at` est une date sans heure, à formater en composantes locales (même précaution que `formatValidUntil` dans `MembershipSection`, sinon décalage d'un jour en UTC-4).

### 2.4 Présentation (cadrage, pas de décision visuelle)

- La lecture rejoint la requête du bloc Adhésion. **Recommandé** : étendre `GetProfileMembershipUseCase` (il résout déjà saison et adhésion) pour renvoyer aussi versements, montant dû effectif, statut et `paymentUrl`, sous la clé existante `profileMembership(userId)`. Cette clé est **déjà invalidée** après un paiement saisi par le Trésorier (`profileAll`, AC-TR-18). Si une clé distincte est préférée, elle doit commencer par `['profile', userId, …]` pour rester couverte par `profileAll`, et vivre dans `query-keys.ts`.
- Aucun nouveau `can()`, aucun import de `data/` depuis `presentation/`.
- Le lien s'ouvre hors de l'application (`target="_blank"`, `rel="noopener noreferrer"`). En PWA installée, il bascule vers le navigateur du système. L'URL est rendue **telle quelle**, sans ajout de paramètre.
- Le membre doit savoir que payer par le lien **ne met pas à jour** l'écran tout de suite. Une ligne d'aide accompagne le lien (texte par défaut : « Le paiement s'effectue sur un site externe. Il apparaîtra ici une fois enregistré par le trésorier. », PO-PMD-09).

## 3. RBAC

### Ligne de matrice applicable

**« Voir le statut de cotisation »**, recopiée :

| Joueur/Joueuse | Coach/Staff | Resp. section | Dirigeant habilité | Trésorier | Référent médical | Bénévole | Administrateur |
|---|---|---|---|---|---|---|---|
| ✅ (soi-même) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |

et **« Voir son propre profil/dossier »** : ✅ pour les 8 rôles.

| Rôle | Interaction avec cette feature |
|---|---|
| Joueur/Joueuse | Lit **sa** cotisation et **ses** versements ; voit le lien si non soldée. Aucune écriture |
| Coach/Staff, Resp. section, Référent médical, Bénévole | Matrice ❌ sur « statut de cotisation ». **Défaut retenu** : ce ❌ vise la cotisation **des autres** ; leur **propre** cotisation est visible sur leur profil comme pour un joueur, via « Voir son propre profil/dossier ✅ ». **Lecture à confirmer** (PO-PMD-02) |
| Dirigeant habilité, Trésorier | Idem, **leur propre** cotisation seulement sur cet écran. Leur accès club-wide passe par la liste « Cotisations » (`dues:read`), **pas** par le profil |
| Administrateur | Idem sur son profil ; **seul rôle qui écrit `seasons.payment_url`** (`'season:write': ['admin']`, existant) |

Le bloc Adhésion est **commun** au compte (hors onglets de rôle, `profile-page` « Structure commune ») : un compte multi-rôles voit **une seule** ligne Cotisation, quel que soit l'onglet ouvert.

### Entrées de matrice : **aucune**

- **Lecture** : RLS seule. Critère de `rbac-matrix.ts` : `presentation/` rend ce que renvoie la lecture de sa propre ligne et ne décide rien avant la requête. L'en-tête de `rbac-matrix.ts` cite déjà « lecture de son propre profil/adhésion » parmi les lectures volontairement absentes. Afficher ou non le lien est une **règle de données** (statut + URL présente), pas une autorisation : prédicat dans `domain/rules/`, pas dans `domain/policies/`.
- **Écriture du lien** : couverte par `'season:write': ['admin']` (existant) et ses politiques SQL.
- **Seul cas qui créerait une entrée** : si PO-PMD-02 est tranché « seuls les rôles ✅ voient leur propre cotisation ». Il faudrait alors une action de lecture (ex. `'dues:read-own'`) que la Page consulte avant de rendre la ligne. **Non proposée tant que PO-PMD-02 n'est pas tranché dans ce sens.**

### RLS / SQL : récapitulatif

| Objet | Changement |
|---|---|
| `memberships_select_own`, `membership_payments_select_own_or_admin`, `seasons_select_authenticated` | **Aucun** |
| `seasons_insert_admin`, `seasons_update_admin` | **Aucun** (couvrent la nouvelle colonne) |
| `public.seasons` | `add column payment_url text` + contrainte CHECK (§2.2), commentée `'season:write'` / validation de `UpdateSeasonUseCase` |
| Fonction `security definer` | **Aucune** |

## 4. Données sensibles

| Nature | Cette feature | Conséquence |
|---|---|---|
| **Financière nominative** | **Oui** : montant dû, versé, versements datés et moyen de paiement **du compte lui-même** | Lecture de sa propre ligne seulement (AC-01). Aucune nouvelle donnée **stockée** : ces lignes existent déjà et relèvent de la catégorie « Données financières » de `RETENTION_PURGE.md` |
| **Configuration** (`payment_url`) | Non nominative, non financière au sens de RETENTION | Suit la saison : aucune purge, comme le tarif de saison (`web-seasons` §4) |
| **Santé** | Aucune | — |
| **Tiers** | Aucune donnée d'un autre membre n'est rendue. `recorded_by` (UUID) est lisible par API mais jamais rendu (§2.1, PO-PMD-07) | — |
| **Prestataire externe** | Le membre est envoyé vers un site tiers où il saisit lui-même ses données de paiement. L'application ne transmet **rien** (URL sans paramètre). Le choix du prestataire et son encadrement contractuel (sous-traitance RGPD) relèvent du club | PO-PMD-03 |
| **Sécurité** | Un lien remplacé par un lien malveillant (compte admin compromis) enverrait tous les membres vers une page frauduleuse | `https:` imposé des deux côtés, MFA admin (CDC), modification tracée par `season.updated` |

### Journal d'audit

- **Lecture de sa propre cotisation** : **non tracée**. Ce n'est ni une consultation de santé ni un export nominatif (CDC §11.3), et le membre consulte ses propres données. Même position que la lecture des notifications (`mobile-treasurer` §E).
- **Toucher le lien** : non tracé (aucune action métier dans l'application).
- **Modification du lien par l'admin** : déjà tracée par `season.updated` (émis par `UpdateSeasonUseCase`, jamais par un composant). Les `metadata` actuelles (`{ label }`) ne disent pas **quel** champ a changé (PO-PMD-08).
- Aucun nouveau code dans `AUDIT_ACTIONS` ni dans `audit_log_action_check`.

### Rétention

Rien de nouveau à purger. Les versements affichés suivent la durée comptable déjà en attente de validation (`RETENTION_PURGE.md` point ouvert n°2, PO-TR-16). Aucune logique d'expiration dans `domain/`.

## 5. Critères d'acceptation

Préfixe **`AC-PMD-`**. AC-01/AC-02 (CDC §17.2) s'appliquent tels quels.

**Sécurité et données**

| Réf. | Critère |
|---|---|
| AC-PMD-01 | Contre la base, avec un jeton de membre : `select` sur `membership_payments` ne renvoie que les versements de **ses** adhésions non archivées. Le versement d'un autre membre, ou d'une adhésion archivée à lui, n'est jamais renvoyé. Vérifié avec un jeton Joueur, Coach et Trésorier |
| AC-PMD-02 | Aucune politique RLS n'est créée ni modifiée par cette feature ; aucune fonction `security definer` n'est ajoutée |
| AC-PMD-03 | L'écran ne rend jamais `recorded_by`, `recorded_at`, ni le nom de la personne qui a saisi un versement |
| AC-PMD-04 | Aucune entrée n'est ajoutée à `rbac-matrix.ts`, `actions.ts`, `AUDIT_ACTIONS` ni `audit_log_action_check` (sauf si PO-PMD-02 est tranché autrement) |

**Ligne « Cotisation »**

| Réf. | Critère |
|---|---|
| AC-PMD-05 | Avec une adhésion de la saison en cours, le bloc Adhésion affiche une ligne « Cotisation · {versé} € / {dû} € » et une pastille **texte** Soldée / Partielle / Impayée. Le dû vient de `effectiveAmountDueCents()` (adhésion, sinon tarif de saison) ; le statut vient de `membershipPaymentStatus()`. Aucun calcul parallèle dans le ViewModel ou le composant |
| AC-PMD-06 | Montant dû indéfini (`'undefined'`) : la ligne s'affiche avec le versé et une mention neutre, sans pastille Soldée/Partielle/Impayée et sans lien (défaut PO-PMD-04) |
| AC-PMD-07 | Sans adhésion pour la saison en cours, ou sans saison en cours : **aucune** ligne Cotisation ni lien ; les messages existants du bloc Adhésion (« Non inscrit·e… », « Aucune saison en cours ») restent inchangés |
| AC-PMD-08 | Déplier la ligne affiche ses versements du plus récent au plus ancien (date du versement décroissante, puis heure de saisie) : date longue en français, montant, et libellé du moyen de paiement (CB, Espèces, Virement, Autre via `payment-method-labels.ts`) ; **rien** quand le moyen est `null`. Sans versement : « Aucun versement enregistré ». Aucun bouton d'action dans la liste |
| AC-PMD-09 | La ligne est repliée par défaut ; toute la zone de la ligne est la cible du dépliage (≥ `h-11`), avec `aria-expanded` et un indicateur non porté par la seule couleur |
| AC-PMD-10 | Une date `paid_at` s'affiche au même jour calendaire qu'en base sur un appareil en UTC-4 (pas de décalage d'un jour) |

**Lien de paiement**

| Réf. | Critère |
|---|---|
| AC-PMD-11 | Le lien est rendu **si et seulement si** le statut est `unpaid` ou `partial` **et** la saison porte un `payment_url` non nul. Prédicat pur du domaine testé par Vitest (soldée, trop-perçu, partielle, impayée, indéfinie, URL nulle) |
| AC-PMD-12 | Statut Soldée, statut indéfini ou URL absente : le lien est **absent**, jamais grisé, jamais remplacé par un texte de substitution |
| AC-PMD-13 | Le lien ouvre l'URL **exacte** de la saison hors de l'application (`target="_blank"`, `rel="noopener noreferrer"`), sans aucun paramètre ajouté (nom, montant, identifiant). Cible ≥ `h-11`, libellé textuel explicite, indication de site externe |
| AC-PMD-14 | Une ligne d'aide indique que le paiement se fait sur un site externe et n'apparaîtra qu'une fois enregistré par le trésorier. Toucher le lien ne modifie aucune donnée et ne déclenche aucun appel en écriture |
| AC-PMD-15 | Après qu'un Trésorier ou un admin a enregistré un versement, le profil du membre affiche le nouveau versement, le nouveau statut et la disparition éventuelle du lien **au prochain chargement ou à la reprise de focus**, sans temps réel. Sur l'appareil du Trésorier, la clé du profil est invalidée par `profileAll` (AC-TR-18) |

**Colonne et backoffice**

| Réf. | Critère |
|---|---|
| AC-PMD-16 | Contre la base : `seasons.payment_url` accepte `null` et une URL `https://…` ; elle refuse `http://…`, `javascript:…`, une chaîne vide, une valeur avec espaces et une valeur de plus de 2 048 caractères. Avec un jeton non admin, toute écriture sur `seasons` reste refusée |
| AC-PMD-17 | `CreateSeasonUseCase` / `UpdateSeasonUseCase` normalisent une chaîne vide en `null` et lèvent `InvalidSeasonInputError` sur une URL non `https:` ou invalide, **avant** tout appel réseau. Tests Vitest. Le CHECK SQL et la validation du domaine portent un commentaire de renvoi mutuel |
| AC-PMD-18 | `SeasonFormDialog` gagne un seul champ facultatif « Lien de paiement », pré-rempli en modification ; une URL invalide affiche un message français et conserve les saisies. La liste des saisons garde ses quatre colonnes (AC-WS-35) |
| AC-PMD-19 | Modifier le lien d'une saison produit une entrée `season.updated` dans le journal d'audit, vérifiée contre la base |

**Transverse**

| Réf. | Critère |
|---|---|
| AC-PMD-20 | Un compte multi-rôles voit **une seule** ligne Cotisation, hors onglets de rôle, identique quel que soit l'onglet actif |
| AC-PMD-21 | Statut, montants et lien portés par du **texte**, jamais par la couleur seule ; contraste AA sur fond sombre ; `min-w-0` sur toute paire libellé/montant côte à côte ; vérifié sur un viewport mobile réel |
| AC-PMD-22 | Non-régression : identité, rôles, bloc Adhésion existant (saison, licence, statut, validité), bandeau de rappel (AC-TR-39 : toujours sans lien ni versements), liste Trésorier et `/admin/memberships` inchangés |
| AC-PMD-23 | Clés de requête dans `query-keys.ts`, sous le préfixe `['profile', userId, …]` ; booléens (`showPaymentLink`, statut) calculés par le ViewModel ; aucun import de `data/` depuis `presentation/` ; aucun nom de personne dans le code ni les fixtures |

## 6. Points ouverts

| Réf. | Question | Défaut proposé | Pour qui | Bloquant ? |
|---|---|---|---|---|
| **PO-PMD-01** | **Maquette** : existe-t-il une maquette pour la ligne Cotisation et le lien ? Aucune ligne au registre, et les exports `profile-page` v4 n'en montrent pas. Question posée **une seule fois** (`DESIGN_LINKS.md` §4) | Aucune maquette : conception par composition (`MembershipSection`, carte dépliable `DueCard`), ligne `absent` du §0 recopiée, ne plus redemander | **Développeuse** | **OUI : bloque la transmission à designer-agent** jusqu'à la réponse (« pas de maquette » ou un lien) |
| PO-PMD-02 | **Matrice « Voir le statut de cotisation »** : ❌ pour Coach, Resp. section, Référent médical et Bénévole. Vise-t-il la cotisation des autres (lecture retenue) ou leur interdit-il de voir **la leur** ? | Le ❌ vise les autres ; chacun voit sa propre cotisation (« Voir son propre profil/dossier ✅ ») | Bureau | Non pour la conception (même mise en page). Si la réponse est restrictive : une entrée de matrice devient nécessaire (§3) |
| PO-PMD-03 | **Paiement externe** : le Bureau confirme-t-il un paiement par une plateforme tierce (laquelle) ? Le CDC dit « sans encaissement en ligne (7.2) » pour le P1. Encadrement RGPD du prestataire (sous-traitance) | Accepté par la développeuse comme simple renvoi ; confirmation Bureau + référent RGPD attendue | Bureau, Trésorier, référent RGPD (**non désigné**) | Non pour concevoir ni construire ; **à trancher avant mise en production** |
| PO-PMD-04 | Montant dû **indéfini** (`'undefined'`) : quel affichage ? Hérite de PO-WM-02 / PO-TR-03 | Versé seul + mention neutre « Montant non fixé », pas de pastille, pas de lien | Développeuse / Trésorier | Non |
| PO-PMD-05 | Lien **personnalisé** (pré-remplir nom, montant restant) si le prestataire le permet ? | Non : URL par saison rendue telle quelle, aucune donnée transmise au tiers | Développeuse / référent RGPD | Non |
| PO-PMD-06 | Le bandeau de rappel (`mobile-treasurer` §H) doit-il aussi porter le lien ? AC-TR-39 l'interdit | Non, AC-TR-39 inchangé ; le membre trouve le lien sur son profil | Développeuse | Non |
| PO-PMD-07 | `recorded_by` / `recorded_at` de ses propres versements sont lisibles par appel direct à l'API (situation antérieure) : acceptable ? | Oui : UUID opaque, jamais rendu. Sinon : vue ou fonction de projection | Référent RGPD | Non |
| PO-PMD-08 | `season.updated` ne précise pas quel champ a changé : faut-il ajouter aux `metadata` un indicateur « lien de paiement modifié » (sans l'URL) ? | Non dans cette passe ; l'entrée existante suffit | Développeuse / Bureau | Non |
| PO-PMD-09 | Libellés exacts : texte du lien (« Payer ma cotisation »), ligne d'aide (§2.4), mention du cas indéfini | Textes de ce spec | Bureau / Trésorier | Non (texte modifiable sans changer la conception) |
| PO-PMD-10 | Afficher le **reste dû** à côté du lien (« Reste {montant} ») ? La demande ne le cite pas | Non : « {versé} / {dû} » suffit | Développeuse | Non |

**Reconduits, non rouverts** : PO-WM-02 (cas limites de l'état), PO-WM-04 (correction de versement), PO-TR-16 (rétention financière), PO-PR-02 (rôle actif).

## Transmission

**Prêt pour designer-agent : NON, une seule réponse manque.** **PO-PMD-01 bloque** : il faut que la développeuse dise une fois s'il existe une maquette (lien) ou non. Si la réponse est « pas de maquette », la ligne `absent` du §0 est recopiée dans `docs/designs/DESIGN_LINKS.md` et la transmission est immédiate : le reste du spec est complet et aucun autre point ne change la mise en page.

- **Avant mise en production, sans bloquer conception ni construction** : PO-PMD-03 (accord du Bureau sur le paiement externe, encadrement RGPD du prestataire).
- **Implémentation** : la migration `seasons.payment_url` (colonne + CHECK) est à écrire puis à **proposer à l'application**, jamais appliquée en silence. Aucune autre migration.
- **Amendements datés** à reporter dans `specs/profile-page.md` (AC-PR-10 et paragraphes liés), `specs/mobile-treasurer.md` (AC-TR-43, §H) et `specs/web-seasons.md` (§2.1, AC-WS-31) : voir §1.

## UI design

> Rédigé par designer-agent le 2026-10-05. **Décisions développeuse reprises** : PO-PMD-01 tranché, **aucune maquette** (ligne `absent` ajoutée à `docs/designs/DESIGN_LINKS.md` §2, ne plus redemander ; elle remplace la ligne pré-rédigée du §0) ; PO-PMD-02 tranché, **chaque rôle voit sa propre cotisation**, donc aucune entrée de matrice (AC-PMD-04) et une mise en page unique pour les 8 rôles. Le statut « bloquant » de l'en-tête et de « Transmission » est donc levé.

### Références visuelles utilisées

- `docs/designs/profile-page/[v4] [Joueur] Mob - Profil.png` (et la variante `[Coach]`) : carte « ADHÉSION » à lignes libellé gris / valeur blanche grasse, séparées par un filet, badge « Active » en pastille verte à droite. **Aucune ligne de cotisation n'y figure** : cette feature compose, elle ne copie pas une maquette. Le code construit (`MembershipSection.tsx`) est la référence de mise en page réelle (carte `rounded-2xl border-white/10 bg-white/5`, lignes `px-4 py-3.5`).
- `DueCard.tsx` (Trésorier, `docs/designs/treasurer/[v5] [Trésorier] Mob - Cotisations {1..6}.png`) : patron de la zone de dépliage entière (`min-h-11`, `aria-expanded`/`aria-controls`, chevron qui pivote), du titre « VERSEMENTS », de la liste montant / moyen · date et de l'état vide « Aucun versement enregistré ».
- `PaymentStatusBadge.tsx` : pastille texte à 4 états (Soldée vert, Partielle ambre, Impayée rouge, indéfini neutre).

**Aucun nouveau patron visuel.** Tout est une variation de lignes existantes ; pas de prototype Claude Design à demander.

### 1. Emplacement

Écran **Menu** (point d'entrée du profil), page Profil, **bloc « ADHÉSION »** (`MembershipSection`), commun au compte et **hors onglets de rôle** (AC-PMD-20). La ligne Cotisation s'ajoute **à la fin de la carte**, après « Valide jusqu'au », dans la même `<ul>`. Le lien de paiement et sa ligne d'aide forment un bloc **sous la carte** (pas dans la `<ul>`, car ce n'est pas une ligne libellé/valeur).

La ligne n'existe que si le bloc rend déjà la carte (saison en cours **et** adhésion). Les messages « Chargement… », « Impossible de charger… », « Aucune saison en cours », « Non inscrit·e pour la saison … » restent inchangés et **sans ligne Cotisation ni lien** (AC-PMD-07).

### 2. Par rôle (RBAC du §3, non redéfini)

Mise en page **identique pour les 8 rôles** : lecture de sa propre ligne, RLS seule, aucun `can()` consulté par la Page. Rien n'est masqué, grisé ou ajouté selon le rôle. Un compte multi-rôles voit une seule ligne, quel que soit l'onglet. Seul l'**administrateur** a un contrôle supplémentaire, hors profil : le champ « Lien de paiement » du `SeasonFormDialog` (§6), déjà couvert par `'season:write'` ; la carte « Saisons » du backoffice n'apparaît déjà que pour lui.

### 3. Ligne « Cotisation » (composant dérivé, `DuesRow`)

**Repliée** (état par défaut, AC-PMD-09). Un seul `<button type="button">` occupe toute la largeur de la ligne, `min-h-11 w-full min-w-0`, padding `px-4 py-3.5` comme les autres lignes, `aria-expanded`, `aria-controls` pointant le panneau :

- Gauche : libellé « Cotisation » (`text-[13.5px] text-white/50`, comme « Saison »), puis en dessous ou à la suite, le texte `{versé} € / {dû} €` en blanc gras (`text-[14px] font-bold`). Format montant : euros, virgule française, jamais de centimes superflus (même formateur que le Trésorier : `due-view.ts`, ne pas en écrire un second).
- Droite : `PaymentStatusBadge` (Soldée / Partielle / Impayée), puis chevron `IconChevronDown` (`size-4.5`, `text-white/60`) qui pivote de 180° quand déplié. Le chevron est l'indicateur non coloré du dépliage (AC-PMD-09), en plus de `aria-expanded`.
- **Côte à côte** : le bloc gauche porte `min-w-0` et le texte des montants `truncate` ; la pastille et le chevron sont `shrink-0`. À 320-360 px de large, la pastille et le chevron gardent leur largeur, c'est le texte de gauche qui se contracte (jamais l'inverse). À vérifier sur un viewport mobile réel (AC-PMD-21).
- Libellé accessible du bouton : « Cotisation, {versé} euros sur {dû} euros, {statut} ». Le statut est du texte, jamais la couleur seule.

**Dépliée** : un panneau `id` dédié sous la ligne, séparé par `border-t border-white/10`, `px-4 py-3`, même structure que le panneau de `DueCard` :

- Titre « VERSEMENTS » (`text-[11.5px] font-bold tracking-wider uppercase text-white/45`).
- Liste, **du plus récent au plus ancien** (ordre fourni par le domaine/repository, la Page ne retrie pas). Chaque ligne : à gauche le **montant** (`font-extrabold text-white`, `shrink-0`), à droite `{moyen} · {date}` (`min-w-0 truncate text-[12.5px] text-white/70`). Moyen omis, avec son séparateur, quand il est `null` (on affiche la date seule, sans « · » orphelin). Moyens via `payment-method-labels.ts` (CB, Espèces, Virement, Autre). Date longue française, composantes locales (AC-PMD-10).
- **État vide** : « Aucun versement enregistré » (`text-[13px] text-white/70`), même texte que le Trésorier.
- **Aucun bouton** dans le panneau (pas d'« Ajouter un paiement », pas de « Modifier » : lecture seule, AC-PMD-08). Rien qui laisse penser que le membre peut déclarer un versement.
- Ne rend jamais `recorded_by` / `recorded_at` ni le nom du saisisseur (AC-PMD-03).
- État de dépliage local au composant (`useState` ou état du ViewModel du profil) ; replié à chaque chargement.

**Troncature de la liste** : pas de « voir plus ». Le nombre de versements d'une saison est petit ; la liste s'affiche entière. Pas de barre de progression (la ligne repliée porte déjà `versé / dû`, PO-PMD-10 : pas de « reste dû »).

### 4. États

| État | Rendu |
|---|---|
| **Chargement** | Inchangé : le bloc affiche « Chargement… » (une seule requête, la ligne Cotisation arrive avec l'adhésion via `profileMembership`). Pas de squelette séparé pour la ligne |
| **Erreur** | Inchangé : « Impossible de charger les informations d'adhésion. » couvre aussi la cotisation, car la lecture est jointe à celle de l'adhésion (§2.4). Si l'implémentation choisit une clé séparée, **l'erreur de la cotisation seule** ne doit pas masquer les lignes Saison/Licence/Statut/Validité : la carte s'affiche, et une ligne neutre « Cotisation indisponible pour le moment » (`text-white/50`, sans pastille, sans lien) remplace la ligne Cotisation |
| **Payée / trop-perçu** | `Soldée`, pas de lien, pas d'aide (AC-PMD-12). Montants réels affichés (ex. `130 € / 120 €`) |
| **Partielle / Impayée** | Pastille ambre / rouge + libellé texte. Lien et aide si l'URL existe |
| **Montant dû indéfini** (PO-PMD-04) | Ligne **non dépliable par défaut seulement si aucun versement** ; sinon dépliable. Repliée : « Cotisation » à gauche, `{versé} €` + mention « Montant non fixé » (`text-white/50`) à droite ; **pas de pastille Soldée/Partielle/Impayée**, pas de lien. Variante neutre de `PaymentStatusBadge` (`undefined`) tolérée si la développeuse préfère une pastille grise « Non fixé » : même rendu texte, voir question UI-1 |
| **Aucun versement** | Ligne repliée `0 € / {dû} €` + `Impayée` ; dépliée : « Aucun versement enregistré » |
| **Sans adhésion / sans saison** | Pas de ligne (AC-PMD-07) |

### 5. Lien de paiement (bloc sous la carte)

Rendu **si et seulement si** `showPaymentLink` est vrai (booléen calculé par le ViewModel depuis `shouldShowDuesPaymentLink`, AC-PMD-11). Sinon **totalement absent** : ni grisé, ni texte de substitution (AC-PMD-12).

Bloc `flex flex-col gap-2`, placé juste sous la carte Adhésion (marge `mt-2.5`, gouttière `px-0` : la section porte déjà `px-5.5`) :

1. **Lien-bouton** : élément `<a href={paymentUrl} target="_blank" rel="noopener noreferrer">` stylé comme un `Button` shadcn (`asChild` sur le `Button`, pas de `<button>` qui navigue), `h-11 w-full min-w-0 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green`, **même style que les boutons primaires déjà construits**. Libellé « Payer ma cotisation » suivi d'une icône `IconExternalLink` (`aria-hidden`) : l'icône signale le renvoi externe de façon visuelle, le nom accessible ajoute « (s'ouvre dans un nouvel onglet) » via un `sr-only`. Aucune URL affichée en clair, aucun paramètre ajouté (AC-PMD-13).
2. **Ligne d'aide** sous le bouton : « Le paiement s'effectue sur un site externe. Il apparaîtra ici une fois enregistré par le trésorier. » (`text-[12.5px] text-white/60`, texte par défaut PO-PMD-09, centrée ou alignée à gauche comme les autres textes d'aide du profil). Obligatoire dès que le lien est rendu (AC-PMD-14).

Aucun état de chargement ni de désactivation du lien : il n'a aucun effet de bord (aucun appel en écriture, aucune mutation, rien à « soumettre »). Il n'y a pas d'état « payé en attente » côté application.

**Pourquoi hors de la carte** : la carte est une pile de paires libellé/valeur ; un bouton plein dans la pile casserait ce rythme et sa hauteur de 44 px serait coupée par le `overflow-hidden` arrondi. Sous la carte, il suit le patron « action sous le bloc » du profil et du dashboard.

### 6. Backoffice : champ « Lien de paiement » dans `SeasonFormDialog`

Variation du champ facultatif « Cotisation (€) » existant (même `Label` uppercase, même texte d'aide `text-xs text-muted-foreground`). **Aucune maquette de dialogue n'existe** (cf. note `web-seasons` du registre) : on reste sur le patron déjà construit.

- Position : **dernier champ**, après « Cotisation (€) » (autre champ facultatif, même groupe logique « tarif et paiement »).
- Libellé : « Lien de paiement (facultatif) ». `Input` `type="url"`, `inputMode="url"`, `autoComplete="off"`, `placeholder="https://…"`, `h-11 rounded-xl`, pleine largeur (pas de paire côte à côte, donc pas de `min-w-0` requis ; on le garde sur le conteneur par prudence pour les URL longues, qui ne doivent pas élargir le dialogue). Jamais `required`.
- Aide sous le champ : « Page de paiement de la cotisation, ouverte depuis le profil des membres. Laisser vide pour ne pas afficher de lien. Adresse en https uniquement. »
- Pré-rempli en modification avec la valeur existante ; vide à la création ; désactivé pendant l'envoi (`vm.isSubmitting`) comme les autres.
- **Validation** : aucune validation navigateur bloquante (`noValidate` n'est pas imposé, mais le message natif de `type="url"` n'est pas celui du produit) ; la validation vient du domaine (`InvalidSeasonInputError`) et s'affiche dans **l'`Alert` destructive existante en haut du formulaire** (`role="alert"`), saisies conservées, dialogue ouvert (AC-PMD-18). Si une erreur par champ est préférée, voir UI-2. Messages (français, via `mapDomainErrorToUiError`) :
  - non `https:` ou URL illisible : « Le lien de paiement doit être une adresse valide commençant par https:// »
  - plus de 2 048 caractères : « Le lien de paiement est trop long (2 048 caractères maximum) »
  - chaîne vide ou blanche : **pas d'erreur**, normalisée en `null` (champ effacé = lien retiré).
- Aucune colonne dans la liste des saisons (AC-WS-35).

### 7. Composants nouveaux ou modifiés

| Composant | Statut | Notes |
|---|---|---|
| `MembershipSection.tsx` | **modifié** | Reçoit la cotisation (déjà calculée par le ViewModel : libellés de montants, statut, libellé de statut, versements formatés, `showPaymentLink`, `paymentUrl`). Aucune comparaison de montant ni de statut dans la Page |
| `DuesRow` (local à `features/profile/components/`) | **nouveau, dérivé** | Ligne repliable décrite au §3. Pas de partage avec `DueCard` : celle-ci a des props Trésorier (initiales, barre, relance, ajout). Seule la structure est reprise |
| `DuesPaymentLink` (local) | **nouveau, simple** | Bouton-lien + aide du §5 |
| `PaymentStatusBadge` | **réutilisé** | Vit sous `features/treasurer/components/`. L'importer tel quel depuis le profil crée une dépendance feature-à-feature. **Recommandation** : le déplacer dans `presentation/shared/components/` (déplacement pur) puis l'importer des deux côtés ; à valider par la développeuse (UI-3). Libellés Soldée / Partielle / Impayée issus du ViewModel, pas du composant |
| `SeasonFormDialog.tsx` | **modifié** | Un champ, §6 |
| `shadcn` | **déjà vendorés** | `Button` (`asChild`), `Input`, `Label`, `Alert`. Aucun `npx shadcn add` requis |

### 8. Contraintes mobiles (CLAUDE.md §6) : récapitulatif pour l'implémentation

- Cibles ≥ `h-11` : bouton de dépliage de la ligne (`min-h-11`), lien de paiement (`h-11`), champ « Lien de paiement » (`h-11`).
- **Une seule paire côte à côte** : libellé/montants à gauche et pastille + chevron à droite de la ligne repliée, puis montant / « moyen · date » dans la liste. Dans chaque cas l'élément textuel est `min-w-0` + `truncate`, l'autre `shrink-0`. Le champ de lien du backoffice est seul sur sa ligne.
- Le profil garde son `BackHeader` `sticky top-0` opaque existant ; rien n'est ajouté dans le flux qui le déplace.
- Vérifier à 320 px et 360 px de large : montants longs (`1 250 € / 1 250 €`), pastille « Partielle », chevron, tout sur une ligne ou une retombée propre sous le libellé.

### 9. Questions UI ouvertes (aucune bloquante)

| Réf. | Question | Défaut retenu |
|---|---|---|
| UI-1 | Cas « montant indéfini » : mention texte « Montant non fixé » sans pastille (défaut PO-PMD-04), ou pastille grise « Non fixé » via `PaymentStatusBadge` `undefined` ? | Mention texte sans pastille, conforme à AC-PMD-06 |
| UI-2 | Erreur de lien invalide : message dans l'`Alert` en haut du dialogue (patron actuel du dialogue Saisons), ou message en rouge sous le champ ? | `Alert` existante, cohérent avec les autres erreurs du dialogue ; un message sous le champ serait un patron nouveau pour ce backoffice |
| UI-3 | Déplacer `PaymentStatusBadge` vers `presentation/shared/components/` pour éviter l'import feature-à-feature ? | Oui, déplacement pur, sans changement de rendu |
| UI-4 | Textes finaux (« Payer ma cotisation », ligne d'aide, « Montant non fixé », « Cotisation indisponible pour le moment ») : validation Bureau/Trésorier, déjà couverte par PO-PMD-09 | Textes de cette section |

**Aucune question bloquante.** Aucune nouvelle destination de navigation (le profil reste dans Menu), aucun nouvel item de barre du bas, aucune carte de Menu ajoutée ou grisée.
