# Spec — Backoffice web : connexion + coquille de tableau de bord vide (`web-empty-state`)

> Statut : **première tranche d'un backoffice web desktop-only**. Aucune donnée n'est lue ni affichée : cette passe produit une page de connexion et une coquille de navigation vide. 11 points ouverts (PO-WE-01 à PO-WE-11), dont **aucun ne bloque la conception UI** ; PO-WE-01 (rôles autorisés) et PO-WE-04 (MFA administrateur) doivent être tranchés avant que le garde d'accès soit implémenté, et PO-WE-02/PO-WE-03 (organisation des fichiers) avant la première ligne de code.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (modules P0/P1/P2 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles, §3.1 gestion des comptes), `docs/ARCHITECTURE.md` (§10 cap mobile-only et évolution desktop, §11 journal d'audit, §13.6 ce qui n'est volontairement pas créé), `docs/GOUVERNANCE.md` §7 (référent RGPD non désigné), `CLAUDE.md` §1/§5/§9, `specs/actus.md` (PO-AT-01, droits d'écriture sur `club_news` non définis), `specs/match_details_page.md` (§2 périmètre admin, « Questions ouvertes UI » #1 : aucun tableau de bord pour un compte admin), `docs/DEFAULTS-A-CHALLENGER.md` (« Permissions d'écriture sur `club_news` — non définies »).
> Maquettes : `docs/designs/desktop/connexion & empty state/[Admin] Web - Connexion-1.png` et `[Admin] Web - Dashboard-{1,2,3}.png`, **lues directement**. Voir §0 pour le statut de registre.
> État du code lu pour cadrer : `presentation/app/router.tsx`, `presentation/app/{RequireSession,RequireCharterAccepted,DashboardIndexPage}.tsx`, `presentation/app/providers/active-role-provider.tsx`, `presentation/features/auth/login/{LoginPage.tsx,useLoginViewModel.ts}`, `presentation/features/auth/forgot-password/`, `domain/entities/user.ts`, `domain/policies/{actions,rbac-matrix,can}.ts`.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe dans le §2 du registre pour la feature `web-empty-state`.** Quatre exports PNG sont en revanche présents dans le dépôt (`docs/designs/desktop/connexion & empty state/`), importés directement par la développeuse sans lien artifact — exactement le cas de figure déjà rencontré pour `menu`, `actus` et `player-vote`, pour lequel le registre a une valeur de statut dédiée : **`instantané seul`**. Conformément au §4 du registre, ce statut signifie « utiliser l'instantané local versionné et **ne pas demander de lien artifact** ». **Aucun lien n'est donc demandé ici**, et aucune redemande n'aura lieu lors d'une passe ultérieure.

Le §4 demande aussi à l'agent d'ajouter lui-même la ligne manquante. L'agent PO **ne peut écrire que dans `specs/`** — même limite que pour `actus` (PO-AT-07) et `player-vote` (§0). La ligne est donc **pré-rédigée ci-dessous, à recopier telle quelle** dans le tableau du §2 du registre par le premier agent ou la développeuse ayant les droits d'écriture sur `docs/` :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| web-empty-state — **backoffice desktop : connexion + coquille de tableau de bord** (`[Admin] Web - Connexion-1`, `[Admin] Web - Dashboard-{1,2,3}`) | — aucun lien fourni | 2026-09-16 | `docs/designs/desktop/connexion & empty state/[Admin] Web - {Connexion-1,Dashboard-1,Dashboard-2,Dashboard-3}.png` | **instantané seul** |

> Deux notes à joindre à la ligne. (a) **Premier dossier `docs/designs/desktop/` du dépôt** — toutes les maquettes précédentes sont mobiles ; le sous-dossier `desktop/` est donc une convention nouvelle, introduite par la développeuse, pas par un agent. (b) **Les trois exports `Dashboard-{1,2,3}` ne sont pas trois écrans mais trois cadrages du même écran** : `Dashboard-1` est la page complète, `Dashboard-2` un recadrage de la seule barre supérieure, `Dashboard-3` un recadrage de la seule navigation latérale. Ne pas les lire comme trois états ou trois variantes de rôle. Le chemin contient une espace et une esperluette (`connexion & empty state`), à protéger dans tout script ou commande qui le manipule.

## 1. Périmètre

### Ce que c'est

La **première tranche d'un backoffice web** destiné à administrer les données que l'application mobile consomme (utilisateurs, sections et équipes, saisons, adhésions, actus). Cette tranche ne construit **que la porte d'entrée et la coquille** :

1. Une **page de connexion propre au backoffice** (« Espace admin »).
2. Un **tableau de bord vide** après connexion : barre supérieure, en-tête de page et navigation latérale — **des destinations vides, aucun contenu métier**.

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Page de connexion backoffice | **Authentification et profils** (« Comptes, rôles, permissions, invitation, MFA admin ») | **P0** |
| Coquille de navigation (les 5 entrées) | Conteneur — ne relève d'aucun module en propre. Les entrées visées, elles, relèvent de **Adhérents et licences** (P0), **Équipes et sections** (P0), **Communication** (P1) | — |

Le backoffice lui-même n'est **pas un module du CDC** : c'est une **surface de rendu supplémentaire** pour des modules déjà priorisés. Il ne crée donc aucune priorité nouvelle et ne doit faire remonter aucun module P2 par la bande.

### Ce que cette tranche débloque, accessoirement

`presentation/app/providers/active-role-provider.tsx` limite aujourd'hui `DashboardRole` à `'coach' | 'player'`, avec ce constat en commentaire : *« a section-manager/authorized-officer/admin account (no player/coach role) never gets a dashboard tab here »* — soit un **compte purement administrateur qui n'a aujourd'hui aucun écran d'atterrissage**, lacune connue et tracée (`specs/match_details_page.md`, « Questions ouvertes UI » #1). Le backoffice est la réponse à cette lacune pour le rôle Administrateur. Cette spec **ne la referme pas pour autant côté mobile** : `ActiveRoleProvider` n'est ni modifié, ni étendu, ni supprimé dans cette passe.

### Contenu retenu — d'après les maquettes, factuellement

**Connexion** (`[Admin] Web - Connexion-1.png`) : logo et nom du club, sous-titre « Espace admin », une carte « Connexion » contenant un champ **Email**, un champ **Mot de passe**, un bouton primaire **« Se connecter »**, un lien **« Mot de passe oublié ? »** (hors périmètre, voir ci-dessous), et une mention de pied de page **« Accès réservé aux comptes administrateurs invités. »**. Aucun autre champ, aucune option de connexion alternative.

**Tableau de bord** (`[Admin] Web - Dashboard-{1,2,3}.png`) :

1. **Barre supérieure** : champ de recherche (« Rechercher un utilisateur, une équipe… »), pastille de rôle « Administrateur », icône de notifications avec pastille, avatar à initiales + identité de l'utilisateur connecté.
2. **En-tête de page** : salutation au prénom, ligne de contexte (saison en cours, nombre de sections, mention « club invitation-only »), et deux boutons d'action « Nouvelle section » et « Inviter un utilisateur ».
3. **Navigation latérale** (`Dashboard-3`), 5 entrées : **Utilisateurs**, **Sections & Équipes**, **Saisons**, **Adhésions**, **Actus** — deux d'entre elles portant un badge numérique — plus un bloc « ALERTE » / « Traiter maintenant » en bas de colonne.
4. **Corps de page** (`Dashboard-1`) : 4 cartes de compteurs (utilisateurs actifs, adhésions à renouveler, sections, saisons) puis deux blocs de contenu.

> **La maquette du tableau de bord montre des données ; cette tranche n'en affiche aucune.** C'est une divergence assumée et non une lecture incomplète de la maquette : voir AC-WE-10, qui interdit jusqu'aux valeurs statiques.

### Hors périmètre — explicitement

- **Le parcours « Mot de passe oublié »**, bien que le lien figure sur la maquette de connexion. **Décision développeuse, reprise telle quelle : hors périmètre entièrement — ni écran, ni route, ni stub, ni lien rendu.** À noter, parce que ça change la nature de la question : un parcours de réinitialisation **existe déjà côté mobile** (`/forgot-password`, `/update-password`, `presentation/features/auth/forgot-password/`). Il n'est **ni modifié, ni supprimé, ni réutilisé** par le backoffice. Le CDC exige par ailleurs une « réinitialisation sécurisée » (§3.1) — cette exigence reste satisfaite par le parcours mobile, pas par le backoffice (PO-WE-07).
- **Tout contenu réel de tableau de bord** : compteurs, badges numériques, bloc ALERTE, blocs de contenu, résultats de recherche. Les destinations sont des **états vides**, sans requête.
- **Toute écriture** : les boutons « Nouvelle section » et « Inviter un utilisateur » ne déclenchent aucun parcours dans cette passe. Le parcours d'invitation (CDC §3.1) est un sujet à part entière, non spécifié.
- **La connexion par lien à usage unique (magic link)** : prévue par le CDC §3.1 et déjà implémentée côté mobile (`requestMagicLinkUseCase`, bascule dans `useLoginViewModel`), mais **absente de la maquette backoffice** — non construite ici (PO-WE-07).
- **La double authentification administrateur (MFA)** : exigence P0 du CDC (« MFA admin », « double authentification obligatoire pour les administrateurs »). **Non construite dans cette tranche**, et c'est le point ouvert le plus lourd de conséquence (PO-WE-04) — le backoffice est précisément la surface que cette exigence vise.
- **Toute nouvelle entité, table, RPC, politique RLS ou repository** : cette tranche ne lit aucune donnée métier au-delà de l'identité de l'utilisateur connecté, déjà servie par `useAuth()`.
- **Tout rendu mobile du backoffice** et toute entrée backoffice dans la navigation mobile (`AppShell` / `BottomNav`).
- **Le module Actus côté rédaction** : l'entrée « Actus » de la navigation latérale ne construit aucune console de rédaction — les droits d'écriture sur `club_news` ne sont toujours pas définis (`specs/actus.md` PO-AT-01, `docs/DEFAULTS-A-CHALLENGER.md`).
- **Le mode dégradé offline** : la matrice ne l'accorde qu'à la *consultation* d'une convocation ; un backoffice d'administration n'entre pas dans ce périmètre.

## 2. RBAC

### La matrice ne tranche pas « qui entre dans le backoffice »

Deux lignes de la matrice sont **administrateur-exclusives** et correspondent exactement à l'esprit de l'écran :

| Permission (matrice CDC) | Joueur | Coach | Resp. section | Dirigeant habilité | Trésorier | Réf. médical | Bénévole | **Administrateur** |
|---|---|---|---|---|---|---|---|---|
| Gérer comptes, rôles, paramétrage | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Consulter le journal d'audit | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

Mais **les entrées de la navigation latérale de la maquette ne se réduisent pas à ces deux lignes** : « Sections & Équipes », « Adhésions » et « Actus » recouvrent des lignes où d'autres rôles ont un ✅ borné à leur périmètre — « Voir les dossiers des autres membres » (✅ Resp. section *sa section*, ✅ Dirigeant habilité), « Gérer postes/missions bénévoles » (✅ Resp. section *sa section*, ✅ Dirigeant habilité), « Envoyer une communication ciblée » (✅ Coach *son équipe*, ✅ Resp. section *sa section*, ✅ Dirigeant habilité), « Exporter des données » (✅ Resp. section *champs autorisés*, ✅ Dirigeant habilité, ✅ Trésorier *financier*).

Autrement dit : **la matrice décrit qui peut faire ces choses, jamais sur quelle surface** (mobile ou backoffice). Le choix des rôles admis à la porte du backoffice est donc un **arbitrage produit, pas une lecture de matrice** → **PO-WE-01**.

### Position retenue pour cette passe — la plus étroite

| Rôle | Accès au backoffice dans cette tranche | Fondement |
|---|---|---|
| **Administrateur** | ✅ | Seules lignes de matrice exclusives au rôle (« Gérer comptes, rôles, paramétrage », « Consulter le journal d'audit ») ; la maquette elle-même est intitulée « Espace admin » et porte la mention **« Accès réservé aux comptes administrateurs invités. »** |
| Dirigeant habilité | ❌ **dans cette passe**, ouvert (PO-WE-01) | Plusieurs ✅ de matrice sur les entrées visées, mais aucun élément de cadrage ne dit qu'il passe par cette surface |
| Responsable de section | ❌ **dans cette passe**, ouvert (PO-WE-01) | Idem, avec une difficulté supplémentaire : ses ✅ sont **bornés à sa section**, alors que la coquille de la maquette est club-wide (« 4 sections ») |
| Trésorier | ❌, ouvert (PO-WE-01) | ✅ financier uniquement ; aucune entrée « Cotisations » dans la maquette, et Cotisations est P1 |
| Coach/Staff, Joueur/Joueuse, Référent médical, Bénévole | ❌ | Aucune ligne de matrice ne les rapproche de l'administration du club ; le référent médical a un périmètre santé tracé et distinct, le bénévole n'a « pas d'accès aux dossiers adhérents » |

C'est l'application directe du principe du moindre privilège rappelé par `docs/roles-personas-as-caribbean.md` (§ « Règle de sécurité ») : **n'ouvrir à personne d'autre tant que PO-WE-01 n'est pas tranché**, plutôt qu'ouvrir large et restreindre après.

### Entrée de matrice proposée

Une **action nouvelle** est justifiée au regard du critère commenté en tête de `rbac-matrix.ts` (« une entrée n'a sa place ici que si `presentation/` doit décider quelque chose […] avant ou indépendamment du résultat de la requête ») : le routage doit décider **de rendre ou non la coquille backoffice**, avant toute requête — et dans cette tranche, il n'y a justement aucune requête.

```
'backoffice:access': ['admin']
```

Borne club-wide, sans portée section/équipe (`admin` n'a pas de champ de portée dans `RoleAssignment`). **À élargir uniquement si PO-WE-01 le décide** — et dans ce cas, avec le contrôle de portée correspondant côté `can.ts`, comme pour `'convocation:create'` et `section-manager`.

### Avertissement — le garde de cette tranche est purement UX

`docs/ARCHITECTURE.md` §12.2 et `CLAUDE.md` §6 sont sans ambiguïté : le front n'est jamais la sécurité, toute règle RBAC existe aussi en RLS. **Cette tranche n'a rien à protéger en RLS** : elle ne lit aucune table métier. Le garde `'backoffice:access'` masque un écran vide — il ne protège aucune donnée, et **ne doit pas être considéré comme un précédent de sécurité** pour les écrans de données qui viendront s'y brancher. La première feature qui affichera des utilisateurs, des adhésions ou des sections dans ce backoffice devra apporter ses propres politiques RLS, indépendamment de ce garde.

### Comptes multi-rôles

Le cumul de rôles est la norme (`docs/roles-personas-as-caribbean.md`, « ex. président et joueur »). Un compte **administrateur + coach** existe donc de façon plausible et dispose d'**une seule session Supabase pour deux surfaces**. Ce que cette tranche ne tranche pas : où atterrit ce compte à la connexion, comment il bascule d'une surface à l'autre, et si la pastille « Administrateur » de la maquette est un **sélecteur de rôle actif** (comme la pastille mobile pilotée par `ActiveRoleProvider`) ou un simple libellé informatif → **PO-WE-06**.

## 3. Données sensibles

| Nature | Cette tranche | Conséquence |
|---|---|---|
| **Données de santé** | Aucune | Aucun trigger d'audit d'accès requis (`ARCHITECTURE.md` §11) |
| **Données financières** | Aucune affichée. L'entrée « Adhésions » y mène, mais ne rend rien dans cette passe | À traiter par la feature qui construira cette destination, pas ici |
| **Données nominatives** | **Uniquement l'identité de l'utilisateur connecté** (nom, initiales, dans la barre supérieure) — donnée que l'utilisateur a déjà sur lui | Pas un accès nominatif au sens de la ligne d'audit « export nominatif » |
| **Identifiants de connexion** | Oui — un formulaire email + mot de passe | Voir ci-dessous |

**Authentification.** La connexion passe par Supabase Auth via le use case existant (`SignInWithPasswordUseCase`) : hachage des mots de passe et transport TLS sont assurés par la plateforme, conformément au CDC §13. Aucun mécanisme d'authentification nouveau, aucune gestion de mot de passe en propre, aucune clé `service_role` — seule la clé `anon` a sa place dans le bundle (`ARCHITECTURE.md` §9).

**Journal d'audit — à trancher, pas à omettre.** La liste des actions tracées du CDC §11.3 (création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, correction de points Legacy, export nominatif) **ne mentionne pas la connexion**. Une lecture littérale conclurait donc « rien à journaliser ici ». Mais `docs/roles-personas-as-caribbean.md` pose pour le rôle Administrateur la limite « **actions sensibles journalisées** », et le backoffice est la surface privilégiée de ce rôle. **Le point est donc ouvert, pas résolu par omission** → **PO-WE-08**. En tout état de cause, si une trace de connexion est décidée, elle ne sera **jamais** écrite depuis un composant (`CLAUDE.md` §6).

**Nom de personne dans la maquette.** Les exports `Dashboard-{1,2}` affichent un nom et un prénom de personne. `CLAUDE.md` §9 interdit tout nom réel dans le code, les commentaires, les commits et la documentation, **y compris en exemple ou en fixture** — il ne doit donc apparaître nulle part, ni en dur, ni en placeholder, ni en test (AC-WE-11). Cette spec ne le reproduit pas non plus.

**RGPD.** Aucun nouveau traitement de données personnelles n'est introduit par cette tranche. Le référent RGPD n'étant toujours pas désigné (`docs/GOUVERNANCE.md` §7, CDC §22 décision n°5), rien ici n'a besoin de son arbitrage — ce qui ne sera **plus vrai** dès la première destination affichant des adhérents.

## 4. Critères d'acceptation

Numérotation `AC-WE-xx`, feature nouvelle — aucune série existante du CDC ne couvre ce périmètre.

**Connexion**

- **AC-WE-01** — La connexion backoffice vit sur une route distincte de `/login` ; `presentation/features/auth/login/` (écran mobile) n'est ni modifié, ni déplacé, ni renommé. Les deux écrans de connexion coexistent.
- **AC-WE-02** — Le formulaire comporte **exactement deux champs** (email, mot de passe) et un bouton de soumission. Aucun champ supplémentaire, aucune case à cocher, aucun sélecteur de rôle.
- **AC-WE-03** — **Aucun lien « Mot de passe oublié ? » n'est rendu** dans le backoffice, et aucune route de réinitialisation propre au backoffice n'est créée. Les routes mobiles `/forgot-password` et `/update-password` restent intactes et fonctionnelles.
- **AC-WE-04** — Aucune option « lien de connexion à usage unique » n'est rendue dans le backoffice.
- **AC-WE-05** — L'authentification appelle le use case existant via le conteneur DI. Aucun appel Supabase depuis `presentation/`, aucun nouveau use case d'authentification.
- **AC-WE-06** — Des identifiants invalides produisent un message d'erreur lisible en français, issu d'une `DomainError` traduite par `mapDomainErrorToUiError` — jamais un message brut de Supabase, jamais une page blanche.
- **AC-WE-07** — Le message d'erreur d'identifiants invalides **ne distingue pas** « compte inconnu » de « mot de passe incorrect », et ne révèle pas non plus qu'un compte existe mais n'a pas le rôle requis.

**Accès et garde**

- **AC-WE-08** — Un accès direct par URL à une route du backoffice **sans session** redirige vers la connexion backoffice (et non vers la connexion mobile).
- **AC-WE-09** — Une session valide **sans le rôle autorisé** (par défaut : hors `admin`, voir PO-WE-01) n'atteint pas la coquille : un écran de refus explicite ou une redirection, jamais un tableau de bord vide qui laisserait croire à un bug ou à une base vide.
- **AC-WE-10** — Aucune route du backoffice n'apparaît dans la navigation mobile (`AppShell` / `BottomNav`), et aucun écran mobile ne gagne d'entrée vers le backoffice.

**Coquille de tableau de bord**

- **AC-WE-11** — Le tableau de bord rend une barre supérieure, un en-tête de page et une navigation latérale à **5 entrées** (Utilisateurs, Sections & Équipes, Saisons, Adhésions, Actus). Chaque entrée est atteignable et rend un **état vide**.
- **AC-WE-12** — **Aucune requête de données n'est déclenchée** par le tableau de bord ni par ses 5 destinations : aucun `useQuery`, aucune nouvelle `queryKey` dans `presentation/shared/query-keys.ts`, aucun nouveau repository ni use case.
- **AC-WE-13** — **Aucune valeur chiffrée de la maquette n'est rendue, même en statique ou en donnée factice** : ni les compteurs (utilisateurs actifs, adhésions à renouveler, sections, saisons), ni les badges numériques de la navigation, ni le bloc « ALERTE ». Même règle que `AC-PD-12` (`specs/player-dashboard.md`) et `AC-PV-15` (`specs/player-vote.md`) : un chiffre affiché est un engagement, un chiffre inventé est une régression de confiance.
- **AC-WE-14** — Le nom et les initiales de la barre supérieure proviennent de l'utilisateur connecté (`User.fullName`). **Aucun nom de personne n'est codé en dur**, y compris celui de la maquette (`CLAUDE.md` §9).
- **AC-WE-15** — Le champ de recherche de la maquette est soit absent, soit rendu visiblement inerte (désactivé) : il ne déclenche aucune requête et ne produit aucun résultat.
- **AC-WE-16** — Les boutons « Nouvelle section » et « Inviter un utilisateur » ne déclenchent **aucune écriture** ni aucun parcours. Les rendre inertes ou les omettre est un choix de design (designer-agent) ; déclencher quelque chose ne l'est pas.
- **AC-WE-17** — La ligne de contexte de l'en-tête (saison, nombre de sections) ne rend **aucune valeur calculée ou inventée** — corollaire d'AC-WE-13 appliqué à l'en-tête.

**Desktop-only et structure**

- **AC-WE-18** — Sous le seuil de largeur desktop retenu (PO-WE-09), le backoffice affiche un **message explicite** (« disponible sur ordinateur ») et non une mise en page dégradée, tronquée ou horizontalement scrollable.
- **AC-WE-19** — Aucun dossier `presentation/desktop/` ni `presentation/mobile/` n'est créé (`CLAUDE.md` §5, `ARCHITECTURE.md` §13.6). Voir PO-WE-02 et PO-WE-03 pour la structure proposée.
- **AC-WE-20** — Aucun écran mobile existant ne change de rendu, de route ou de comportement du fait de cette tranche. Vérifiable en régression sur les tableaux de bord joueur et coach.

**Transverse**

- **AC-WE-21** — CDC §12 : le formulaire de connexion est **entièrement utilisable au clavier** (tabulation, soumission par `Entrée`, focus visible), et les contrastes du fond sombre de la maquette sont **vérifiés** au niveau AA, pas supposés conformes.
- **AC-WE-22** — Aucune donnée de santé, financière, ni nominative autre que l'identité de l'utilisateur connecté n'est lue par cette tranche.

## 5. Questions ouvertes

**PO-WE-01 — Quels rôles accèdent au backoffice ?** *(Bureau / développeuse — bloque le garde d'accès, pas la conception UI.)*
`admin` seul (position retenue par défaut, §2), ou également Dirigeant habilité et/ou Responsable de section, dont la matrice reconnaît des ✅ sur les entrées visées (dossiers adhérents, sections, communication, exports) ? Si Responsable de section est admis, une question supplémentaire s'ouvre immédiatement : la coquille de la maquette est **club-wide**, alors que ses droits sont **bornés à sa section** — il faudrait alors un contrôle de portée dans `can.ts`, sur le modèle de `'convocation:create'`.

**PO-WE-02 — Route et organisation des fichiers.** *(Développeuse — à trancher avant la première ligne de code.)*
Proposition : **même application Vite, même `router.tsx`**, un préfixe de route dédié (par ex. `/admin`), et les écrans sous `presentation/features/backoffice/<écran>/` (Page + ViewModel + composants locaux), conformément à `CLAUDE.md` §5 (« un sous-dossier par écran »). L'alternative — un build ou un déploiement séparé — n'est pas proposée : elle dupliquerait le conteneur DI, les providers et le client Supabase pour un bénéfice non démontré, et le budget du projet est un critère explicite (`CLAUDE.md` §1).

**PO-WE-03 — Desktop-only vs. `CLAUDE.md` §5 : tension à confirmer.** *(Développeuse.)*
`CLAUDE.md` §5 et `ARCHITECTURE.md` §13.6 interdisent de créer `presentation/desktop/` — mais la justification donnée est précise : *« inutiles tant qu'un seul rendu existe »*, *« un dossier à occupant unique est une structure vide qui suggère une symétrie inexistante »*. **La règle vise donc une symétrie vide, pas l'existence d'écrans desktop.** `ARCHITECTURE.md` §10 prévoit d'ailleurs la bascule desktop **au seul niveau du rendu**, avec un `XxxDesktopLayout.tsx` à côté du ViewModel.
Nuance à confirmer, parce que ce cas n'est exactement ni l'un ni l'autre : les écrans du backoffice ne sont **pas des variantes desktop d'écrans mobiles existants** (le cas prévu par §10), ce sont des **écrans propres, sans équivalent mobile**. La résolution proposée — `presentation/features/backoffice/`, avec une garde de largeur (breakpoints Tailwind + écran de repli sous le seuil), **sans dossier `desktop/`** — est cohérente avec la lettre de §5 et avec §10. **Elle n'est pas tranchée unilatéralement ici : elle demande une confirmation explicite de la développeuse**, puisqu'elle constitue la première exception au cap « mobile-only » de `CLAUDE.md` §1 et mériterait sans doute une mise à jour de §1/§5 et de `ARCHITECTURE.md` §10 une fois validée.

**PO-WE-04 — MFA administrateur.** *(Bureau / développeuse — non bloquant pour cette tranche, potentiellement bloquant avant mise en production.)*
Le CDC classe « MFA admin » en **P0** et `docs/roles-personas-as-caribbean.md` §3.1 pose la « double authentification **obligatoire** pour les administrateurs ». Le backoffice est exactement la surface visée. Livrer une connexion administrateur à un seul facteur est donc un **écart connu et daté** vis-à-vis d'une exigence P0 — à assumer comme provisoire, avec une échéance, plutôt qu'à découvrir plus tard. Une entrée dans `docs/DEFAULTS-A-CHALLENGER.md` serait justifiée.

**PO-WE-05 — La charte s'applique-t-elle au backoffice ? Tranché.** *(Développeuse, 2026-09-16 : non.)*
CDC §3.1 : « activation après acceptation de la charte », sans distinction de rôle. La réponse littérale « oui » enverrait un administrateur sur ordinateur vers `/charter`, un écran conçu pour un téléphone. **Décision retenue : les routes backoffice ne passent pas par `RequireCharterAccepted`** — un compte admin n'a pas à accepter la charte pour accéder à `/admin`. Implémenté dans `router.tsx` (l'arbre `/admin` n'est pas nested sous `RequireCharterAccepted`).

**PO-WE-06 — Compte multi-rôles : deux surfaces, une session.** *(Développeuse.)*
Où atterrit un compte administrateur + coach après connexion ? Existe-t-il une bascule explicite entre l'application mobile et le backoffice ? La pastille « Administrateur » de la maquette est-elle un **sélecteur de rôle actif** (comme la pastille mobile, aujourd'hui limitée à `'coach' | 'player'` dans `ActiveRoleProvider`) ou un simple libellé informatif ? Cette tranche suppose le libellé informatif, faute d'élément contraire.

**PO-WE-07 — Mot de passe oublié et magic link : report ou décision définitive ?** *(Développeuse.)*
Hors périmètre est acté pour cette passe. Reste à qualifier : report, ou décision durable ? Si c'est durable, le recours d'un administrateur ayant perdu son mot de passe doit être nommé quelque part (parcours mobile existant ? réinitialisation manuelle par un autre administrateur ?), puisque le CDC §3.1 exige une « réinitialisation sécurisée » et que la maquette, elle, montre le lien.

**PO-WE-08 — Journaliser la connexion au backoffice ?** *(Référent RGPD / Bureau.)*
Voir §3. Non requis par la lettre du CDC §11.3, potentiellement attendu par la limite « actions sensibles journalisées » du rôle Administrateur. Si oui : trigger Postgres ou use case (`ARCHITECTURE.md` §11), et quelle durée de rétention (`RETENTION_PURGE.md`) ?

**PO-WE-09 — Seuil de largeur « desktop » et comportement sous ce seuil.** *(Développeuse / designer.)*
Quelle largeur minimale, et que voit exactement un administrateur qui ouvre l'URL sur son téléphone — un message, une redirection vers l'application mobile, rien ? À noter : `index.html` fixe aujourd'hui `user-scalable=no` pour toute l'application (`docs/DEFAULTS-A-CHALLENGER.md`), défaut pris dans un contexte mobile et jamais évalué pour un rendu desktop.

**PO-WE-10 — Que recouvrent réellement les 5 entrées ?** *(Bureau / développeuse — sans effet sur cette tranche, structurant pour les suivantes.)*
« Saisons » et « Adhésions » ne correspondent à aucun écran spécifié à ce jour. « Actus » existe déjà côté mobile (`specs/actus.md`) : l'entrée backoffice serait-elle une console de **rédaction** ? Si oui, elle bute sur PO-AT-01 — les droits d'écriture sur `club_news` ne sont pas définis, et aucune politique RLS d'écriture n'existe.

**PO-WE-11 — Le bloc « ALERTE / Traiter maintenant » et les badges numériques.** *(Bureau / développeuse.)*
Aucun élément de cadrage ne dit ce qu'ils comptent ni ce qui déclenche une alerte. Non construits ici (AC-WE-13) ; à spécifier avant de les faire apparaître.

## 6. Handoff

Le périmètre visuel est entièrement couvert par les quatre maquettes, et **aucun des points ouverts ne porte sur la mise en page** : PO-WE-01/04/05/06/07/08 sont des décisions produit et sécurité, PO-WE-02/03/09 des décisions de structure et de seuil, PO-WE-10/11 concernent des contenus explicitement hors périmètre. **La spec est donc transmissible à designer-agent en l'état**, avec deux consignes à ne pas perdre en route : aucun chiffre, badge ou compteur de la maquette ne doit être reproduit (AC-WE-13), et aucun lien « Mot de passe oublié ? » ne doit figurer sur l'écran de connexion (AC-WE-03).

## UI design

### Sources utilisées, par ordre de priorité effectif

1. **`docs/designs/DESIGN_LINKS.md` §2** — aucune ligne pour `web-empty-state` au moment de la lecture. Statut retenu : **`instantané seul`** (ligne pré-rédigée par l'agent PO au §0 du présent spec). Le présent agent recopie cette ligne dans le registre, comme déjà fait pour `menu`, `actus` et `player-vote` — aucun lien artifact demandé.
2. **`docs/designs/desktop/connexion & empty state/[Admin] Web - {Connexion-1,Dashboard-1,Dashboard-2,Dashboard-3}.png`**, lus directement. Rappel du §0 : les trois exports `Dashboard-*` sont trois cadrages d'un seul écran (`Dashboard-1` = page complète, `Dashboard-2` = zoom barre supérieure, `Dashboard-3` = zoom navigation latérale), pas trois états ni trois variantes de rôle.
3. `wireframes-basiques-as-caribbean.md` — **non consulté comme référence de mise en page** : c'est le premier écran desktop du dépôt, sans équivalent dans les 4 écrans mobiles (dashboard, calendrier, recherche, menu). Les patrons mobiles (carte compacte, « N total, plus récent développé », filtres à puces) n'ont pas d'équivalent visuel direct sur une barre supérieure ou une navigation latérale desktop ; ils ne sont donc pas forcés ici. Le seul patron mobile repris tel quel est conceptuel, pas visuel : « une carte de nav disparaît plutôt que d'apparaître désactivée » (§2 ci-dessous).
4. Code déjà construit, réutilisé sans le redessiner : `presentation/features/auth/login/{LoginPage.tsx,useLoginViewModel.ts}` pour le câblage (pas le rendu — l'écran mobile n'est ni copié ni modifié, AC-WE-01), `domain/policies/{actions,rbac-matrix,can}.ts` pour le garde, primitives shadcn déjà vendues dans `presentation/shared/components/ui/` (`button.tsx`, `input.tsx`, `avatar.tsx`, `badge.tsx`, `card.tsx`, `label.tsx`, `separator.tsx`, `tabs.tsx`).
5. `specs/web-empty-state.md` §4 (critères d'acceptation) — autoritaire sur ce qui doit être omis (AC-WE-13, AC-WE-15, AC-WE-16, AC-WE-17) : ces critères sont appliqués ci-dessous, pas rediscutés.

### Où ça vit — pas un des 4 écrans de nav mobile, et ce n'est pas une exception à la règle des 4 écrans

Les 4 destinations de navigation fixes (Dashboard, Calendrier, Actus, Menu) sont une contrainte de la **barre de navigation mobile**. Cette tranche ne touche pas cette barre : AC-WE-19/AC-WE-20 l'interdisent explicitement (« aucune route du backoffice n'apparaît dans la navigation mobile », « aucun écran mobile existant ne change »). Le backoffice est une **surface desktop entièrement séparée**, avec ses deux seuls écrans dans cette tranche :

- **`/admin/login`** (nom de route indicatif — AC-WE-01 exige seulement une route distincte de `/login`, PO-WE-02 propose un préfixe `/admin`) : l'écran de connexion « Espace admin ».
- **`/admin`** (ou `/admin/dashboard`) : la coquille de tableau de bord, avec ses 5 entrées de navigation latérale (Utilisateurs, Sections & Équipes, Saisons, Adhésions, Actus) comme **sous-routes de cette seule destination desktop**, au même titre que Dashboard/Calendrier/Actus/Menu sont les 4 destinations de la nav mobile — mais dans un système de navigation propre au backoffice, pas dans la bottom nav.

Ce n'est donc pas un cas où « la feature a besoin d'une 5ᵉ destination mobile » (ce qui déclencherait la règle « s'arrêter et signaler ») : c'est une deuxième application de rendu pour le même compte, déjà actée comme telle par PO-WE-02/PO-WE-03, non par ce document.

### Ce qui change par rôle

Reprend le §2 (RBAC) du présent spec, rien de redéfini ici :

| Rôle | Rendu |
|---|---|
| `admin` (session valide, `can(user, 'backoffice:access')` vrai) | Accède à `/admin` après connexion : coquille complète (barre supérieure, en-tête, nav latérale à 5 entrées, corps en état vide) |
| Tout autre rôle, y compris multi-rôle avec `admin` absent | Session valide mais sans le rôle requis → écran de refus explicite ou redirection (AC-WE-09), jamais la coquille. Composant décrit ci-dessous (`BackofficeAccessDeniedPage`) |
| Aucune session | Redirection vers `/admin/login`, jamais vers `/login` mobile (AC-WE-08) |
| Compte `admin` + un rôle mobile (ex. `admin` + `coach`) | Cette tranche ne construit aucune bascule ; le compte atteint le backoffice via `/admin` et l'app mobile via `/` indépendamment, sans sélecteur croisé (PO-WE-06 reste ouvert — non traité ici) |

Le patron « une carte de menu disparaît plutôt que d'apparaître désactivée » s'applique par analogie à la nav latérale, mais **n'a rien à trancher dans cette tranche** : une seule population (`admin`) y a accès, donc les 5 entrées sont soit toutes visibles, soit la coquille entière n'est pas atteinte. Note prospective, non bloquante : si PO-WE-01 élargit l'accès (dirigeant habilité, responsable de section), certaines des 5 entrées devront probablement disparaître par rôle plutôt que rester visibles et vides pour un rôle qui n'a pas le droit correspondant — à spécifier au moment où PO-WE-01 sera tranché, pas anticipé ici.

### Écran 1 — Connexion (`/admin/login`)

Reprend la maquette `[Admin] Web - Connexion-1.png` presque telle quelle, avec une omission volontaire.

**Layout** : page pleine hauteur, fond sombre, contenu centré verticalement et horizontalement dans une colonne de largeur fixe (~420–480px) quelle que soit la largeur de la fenêtre desktop — pas de mise en page en grille à colonnes multiples, une seule carte centrée comme dans la maquette.

- Logo rond bicolore + « AS Caribbean » (titre) + « Espace admin » (sous-titre) au-dessus de la carte.
- `Card` shadcn (`presentation/shared/components/ui/card.tsx`) contenant :
  - Titre de carte « Connexion ».
  - `Label` + `Input` (type `email`) — placeholder `admin@ascaribbean.com`.
  - `Label` + `Input` (type `password`) — pas d'icône œil/masquer dans la maquette, n'en ajoute pas.
  - `Button` variant `default` (vert, pleine largeur) « Se connecter », type `submit`.
  - **Pas de lien « Mot de passe oublié ? »** — voir ci-dessous.
- Mention de pied de page hors carte : « Accès réservé aux comptes administrateurs invités. »

**Omission explicite (AC-WE-03)** : le lien « Mot de passe oublié ? » visible sur la maquette, sous le bouton « Se connecter », **n'est pas rendu**. Il n'y a pas de composant inerte à sa place, pas de tooltip, pas de placeholder visuel — la carte se termine au bouton de soumission. **Cette zone de la maquette n'a aucune destination dans cette feature.** Ce n'est pas un oubli à corriger plus tard dans cette même tranche : voir PO-WE-07 pour la question de fond (report ou décision durable).

**Cibles tactiles** : bien que le backoffice soit desktop-first (souris/clavier), les deux `Input` et le `Button` de soumission sont dimensionnés à `h-11` (44px), pas au défaut shadcn `h-8` (32px) — un ordinateur portable tactile reste un poste desktop au sens du seuil de largeur (PO-WE-09), et rien n'interdit un usage tactile. Override à faire au site d'appel, même mécanique que celle déjà documentée dans `CLAUDE.md` §6 pour le mobile.

**États** :

| État | Rendu |
|---|---|
| Chargement (soumission en cours) | `Button` en état `disabled` avec libellé inchangé ou un indicateur de chargement inline (à la charge du dev — pas de nouveau composant de spinner à inventer, réutiliser ce qui existe déjà dans `LoginPage.tsx` mobile si un pattern y est déjà présent) ; les deux `Input` passent `disabled` pour empêcher une double soumission |
| Erreur (AC-WE-06/AC-WE-07) | Message d'erreur générique en français sous le bouton ou en haut de carte (ex. « Identifiants incorrects »), rendu via un composant d'alerte existant si disponible (`alert.tsx` vendu dans `ui/`) plutôt qu'un texte brut stylé à la main — jamais de distinction compte inconnu / mot de passe erroné / rôle manquant dans le message |
| Succès | Redirection vers `/admin` (coquille) |

**Accessibilité (AC-WE-21)** : ordre de tabulation Email → Mot de passe → Se connecter, soumission possible par `Entrée` depuis n'importe quel champ (comportement natif d'un `<form>`), focus visible (le style shadcn `focus-visible:ring-3` déjà présent dans `input.tsx`/`button.tsx` suffit, pas de style de focus custom à écrire). Contraste du fond très sombre + texte gris clair (placeholders, mention de pied de page) : **à vérifier au niveau AA une fois les tokens de couleur réels choisis** — non validable sur la seule lecture du PNG, note non bloquante pour le développeur/l'intégration.

### Écran 2 — Coquille de tableau de bord (`/admin`)

Reprend `[Admin] Web - Dashboard-1.png` pour la structure d'ensemble, avec plusieurs omissions dictées par AC-WE-13/15/16/17. Layout en trois zones empilées/juxtaposées : barre supérieure (pleine largeur, fixe), puis en-tête + nav latérale + corps de page en dessous.

#### Barre supérieure (sticky, cf. `Dashboard-2.png`)

Bande horizontale fixe en haut de viewport (`sticky top-0`, fond opaque — même règle que le `BackHeader` mobile documentée dans `CLAUDE.md` §6, pour la même raison : le corps de page peut défiler une fois du contenu réel branché sur les 5 destinations, la barre ne doit pas partir avec lui).

- **Champ de recherche** (« Rechercher un utilisateur, une équipe… ») — `Input` shadcn avec icône de recherche. **Rendu `disabled`** (AC-WE-15) : choix retenu ici plutôt que « absent », pour préserver la structure visuelle de la maquette et parce qu'un champ inerte communique mieux « la recherche arrive » qu'un vide dans la barre. `disabled`, sans `onChange`, sans requête possible.
- **Pastille de rôle** « Administrateur » — `Badge` shadcn, **lecture seule** (pas un `Select`/menu déroulant). Conforme à l'hypothèse retenue en PO-WE-06 (« libellé informatif ») ; si PO-WE-06 tranche plus tard pour un sélecteur de rôle actif, ce composant sera remplacé, pas amendé sur place.
- **Icône de notifications** — rendue **sans la pastille rouge** visible sur la maquette. La pastille signale un compte de notifications non lues ; aucun système de notification n'existe dans cette tranche (AC-WE-12 : aucune requête), donc afficher une pastille serait une donnée inventée au même titre que les compteurs interdits par AC-WE-13, même si ce n'est pas un chiffre. L'icône est **inerte** (pas de clic possible, ou un clic qui ne produit rien) — précision non couverte littéralement par un AC-WE, à confirmer par la développeuse mais retenue par cohérence avec l'esprit d'AC-WE-13.
- **Avatar + identité** — `Avatar`/`AvatarFallback` shadcn avec les **initiales de l'utilisateur connecté**, calculées depuis `User.fullName` (jamais codées en dur, AC-WE-14). Sous l'avatar, nom complet + libellé de rôle (« Administrateur » ou l'équivalent au féminin si le profil le prévoit déjà ailleurs dans l'app — pas une décision de cet écran). **Aucun nom de la maquette (`Sophie Dorval`) ne doit apparaître nulle part**, y compris en exemple de code ou en fixture de test (CLAUDE.md §9, AC-WE-11 de `specs/web-empty-state.md`… en réalité AC-WE-14, la numérotation de l'AC correspondante).

#### En-tête de page

- Salutation « Bonjour, {prénom} » — dérivée de `User.fullName` (premier segment avant l'espace). **Note d'implémentation non bloquante** : `User` n'expose qu'un `fullName`, pas de `firstName` distinct (`domain/entities/user.ts`) ; si `fullName` ne contient pas d'espace (nom seul, organisation…), prévoir un repli sur `fullName` entier plutôt qu'une chaîne vide.
- Ligne de contexte (« Saison 2025-2026 · 4 sections · club invitation-only ») — **omise dans cette tranche** (AC-WE-17) : aucune des deux valeurs (nom de saison, nombre de sections) n'est disponible sans requête, et AC-WE-12 interdit toute requête. Remplacée par une ligne statique et non chiffrée si un texte de contexte est souhaité (ex. simplement « Espace administrateur »), ou omise entièrement — au choix du développeur, aucune des deux options ne viole un AC.
- Boutons « Nouvelle section » et « Inviter un utilisateur » — **rendus, mais inertes** (AC-WE-16) : visuellement identiques à la maquette (`Button` outline + `Button` primaire), `onClick` ne déclenche aucune navigation ni aucune écriture. Les omettre serait tout aussi valide (l'AC dit explicitement que le choix rendre-inerte-vs-omettre appartient au design) ; **on retient « rendus, inertes »** pour donner un repère visuel de ce qui arrivera, plutôt que de faire disparaître deux boutons que la maquette place bien en évidence — mais un `disabled` visuel (pas seulement un handler vide) est recommandé pour ne pas laisser croire qu'ils fonctionnent.

#### Navigation latérale (cf. `Dashboard-3.png`), 5 entrées

Liste verticale de 5 items : Utilisateurs, Sections & Équipes, Saisons, Adhésions, Actus. Chaque item : icône + libellé, état actif marqué par un fond distinct (pas de nouvelle convention de couleur à inventer — réutiliser le token de fond « actif » déjà utilisé ailleurs dans l'app pour un état sélectionné, ex. onglet actif de `Tabs`). Cible tactile par item : hauteur de ligne ≥ 44px (`min-h-11`), toute la largeur de la ligne cliquable (pas seulement le libellé).

**Deux omissions par rapport à la maquette, toutes deux dictées par AC-WE-13/PO-WE-11** :
- **Aucun badge numérique** sur « Utilisateurs » (badge « 1 » sur la maquette) ni sur « Adhésions » (badge « 2 ») — un badge par entrée est un compteur au même titre que ceux du corps de page, interdit tant que PO-WE-11 n'a rien à compter.
- **Le bloc « ALERTE » / « Traiter maintenant »** en bas de colonne (`Dashboard-3.png`) **n'est pas construit** — aucun élément de cadrage ne dit ce qu'il surveille (PO-WE-11), donc rien à afficher, ni un bloc vide à sa place. La navigation latérale se termine simplement après la 5ᵉ entrée.

Chaque entrée route vers sa sous-destination (`/admin/users`, `/admin/sections`, `/admin/seasons`, `/admin/memberships`, `/admin/news`, noms indicatifs) ; par défaut à l'arrivée sur `/admin`, la première entrée (Utilisateurs) est active.

#### Corps de page — état vide

Remplace entièrement les 4 cartes de compteurs et les deux blocs de contenu de `Dashboard-1.png` (AC-WE-13 : aucun des quatre chiffres — utilisateurs actifs, adhésions à renouveler, sections, saisons — n'est reproduit, même en statique).

**Nouveau composant, `BackofficeEmptyState`** (justifié : aucun équivalent visuel n'existe côté mobile — la seule proximité conceptuelle est un état vide générique, pas un composant réutilisable tel quel) :

- Zone centrée dans le corps de page, sous l'en-tête et à droite de la nav latérale.
- Une icône ou illustration simple liée à l'entrée active (ex. une icône « utilisateurs » pour l'onglet Utilisateurs), un titre court (« Aucune donnée pour l'instant » ou équivalent par entrée), une ligne de sous-texte optionnelle expliquant que l'écran arrive prochainement.
- **Pas de chiffre, pas de compteur à 0, pas de barre de progression** — un compteur à zéro serait aussi trompeur qu'un compteur inventé (« 0 utilisateur actif » suggère une lecture réelle de la base, ce que cette tranche ne fait pas).
- Un seul composant, paramétré par un libellé/une icône selon l'entrée de nav active — pas 5 composants dupliqués.
- Aucun état de chargement ni d'erreur pour ce composant : AC-WE-12 garantit qu'aucune requête n'est déclenchée, donc pas de `isLoading`/`error` à modéliser ici (à la différence de l'écran de connexion, qui appelle réellement un use case).

### Nouveau composant — refus d'accès (`BackofficeAccessDeniedPage`)

Requis par AC-WE-09 (« un écran de refus explicite ou une redirection, jamais un tableau de bord vide »). Pas de maquette fournie pour cet écran — proposition minimale, cohérente avec le reste de la charte visuelle sombre : message centré (« Accès non autorisé » ou équivalent), une ligne expliquant que le backoffice est réservé aux comptes administrateurs, et un lien de retour vers l'application mobile (`/`). Pas de bouton « Changer de compte » ni de lien de déconnexion inventé au-delà de ce que l'app propose déjà ailleurs.

### Garde de largeur desktop (PO-WE-09) — proposition à confirmer, pas tranchée ici

AC-WE-18 exige un message explicite sous un seuil, sans dire lequel (PO-WE-09 reste ouvert côté produit). Proposition de designer-agent, à traiter comme un défaut de départ et non une décision finale :

- **Seuil retenu : breakpoint Tailwind `lg` (1024px de largeur de viewport)**, cohérent avec le fait que ces deux écrans utilisent une mise en page à colonnes (nav latérale + corps) qui n'a pas de repli mobile prévu dans cette tranche.
- **Sous ce seuil** : ni les deux écrans du backoffice ni une version tronquée/scrollable horizontalement ne sont rendus. À la place, un écran de repli unique, réutilisable pour `/admin/login` et `/admin` : message centré (« Le backoffice AS Caribbean est disponible sur ordinateur. » ou équivalent), pas de tentative de rendu partiel en dessous.
- Ce garde se fait par une vérification de largeur de viewport côté React (pas seulement CSS `hidden lg:block`, qui laisserait le JS du formulaire de connexion s'exécuter inutilement sur mobile) — mécanisme exact (hook de resize, media query JS) laissé à la développeuse.
- Cette proposition **ne referme pas PO-WE-09** : la valeur exacte du seuil et le texte du message restent à confirmer par la développeuse/designer en séance, ce document ne fait que fournir un défaut exploitable pour ne pas bloquer le scaffolding.

### Composants shadcn mobilisés (aucune primitive nouvelle)

| Élément visuel | Primitive shadcn | Écran |
|---|---|---|
| Carte de connexion, futur écran de refus | `card.tsx` | Connexion, refus d'accès |
| Champs email/mot de passe, recherche (inerte) | `input.tsx` + `label.tsx` | Connexion, barre supérieure |
| Boutons (Se connecter, Nouvelle section, Inviter, items de nav) | `button.tsx` | Connexion, en-tête, nav |
| Pastille de rôle | `badge.tsx` | Barre supérieure |
| Avatar + initiales | `avatar.tsx` (+ `AvatarFallback`) | Barre supérieure |
| Séparateurs de section | `separator.tsx` | En-tête / corps |
| Message d'erreur de connexion | `alert.tsx` (si son style convient une fois vu en contexte, sinon texte simple sous le champ) | Connexion |

Aucune primitive `Tabs`, `Select`, `Checkbox`, `RadioGroup` n'est nécessaire pour cette tranche (pas de bascule d'onglet dans la coquille, pas de sélecteur de rôle actif tant que PO-WE-06 n'est pas tranché).

### Questions ouvertes côté conception (non bloquantes pour le scaffolding)

Aucune de ces questions ne bloque le développement de cette tranche — elles complètent, sans les rouvrir, les points déjà listés au §5 du présent spec (en particulier PO-WE-09 pour le seuil desktop, PO-WE-06 pour la pastille de rôle, PO-WE-11 pour le bloc ALERTE et les badges) :

- **Pastille rouge de l'icône de notifications** : ce document choisit de la retirer entièrement plutôt que de la garder comme fausse donnée (voir « Barre supérieure » ci-dessus) — à confirmer, ce n'est pas couvert littéralement par un AC-WE existant.
- **Boutons « Nouvelle section » / « Inviter un utilisateur » rendus-inertes vs. omis** : ce document retient « rendus, visuellement désactivés » ; AC-WE-16 accepte les deux options, donc pas bloquant, mais à trancher une fois pour ne pas diverger entre les 5 sous-destinations quand elles seront construites.
- **Ligne de contexte de l'en-tête** : ce document propose soit une ligne non chiffrée, soit son omission complète — décision cosmétique, sans impact sur les AC.
