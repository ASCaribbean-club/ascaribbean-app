# Politique de rétention, purge et archivage — AS Caribbean
 
> Statut : **proposition technique à valider par le référent RGPD et le Bureau avant implémentation.** Les durées indiquées sont des points de départ raisonnables, pas des décisions arrêtées — voir section 6.
> Ce document répond à deux exigences croisées : la minimisation des données (RGPD, section 13 du CDC) et la réversibilité complète des données (sections 12 et 21 du CDC). Il sert aussi un objectif pragmatique : maintenir le projet dans les limites du plan gratuit Supabase le plus longtemps possible.
 
## 1. Principe général
 
Trois mouvements distincts s'appliquent à une donnée en fin de vie, et il ne faut pas les confondre :
 
1. **Purge** : suppression définitive et irréversible d'une donnée de la base active.
2. **Pseudonymisation** : suppression des éléments identifiants (nom, contact, données sensibles) en conservant une trace agrégée/anonyme utile au club (statistiques, historique sportif).
3. **Archivage froid** : avant toute purge définitive, un instantané des données est exporté vers un stockage externe à faible coût, pour satisfaire l'exigence de réversibilité même après suppression de la base active.
Aucune donnée n'est purgée sans être passée par l'étape d'archivage froid au préalable, sauf mention contraire explicite (ex. données de santé, pour lesquelles la minimisation prime sur la conservation).
 
## 2. Catégories de données et durées proposées
 
| Catégorie | Donnée concernée | Durée avant action | Action | Justification |
|---|---|---|---|---|
| **Documents administratifs** | Certificats, justificatifs expirés | 12 mois après expiration | Purge (après archivage froid) | Proposition initiale du club, cohérente avec une donnée à faible sensibilité et à durée de vie naturellement bornée. |
| **Données de santé** | Aptitude/inaptitude, indisponibilités santé (section 6.3 du CDC) | Fin de saison sportive + courte marge (ex. 3 mois) | Purge (pas d'archivage en clair — cf. section 4) | Donnée de catégorie spéciale (RGPD article 9). La pertinence d'une aptitude est liée à la saison ; la minimisation doit être plus stricte que pour un document administratif générique. **À confirmer avec le référent RGPD.** |
| **Journal d'audit — logs techniques** | Connexions, navigation, actions non sensibles | 6 à 12 mois | Purge (après archivage froid) | Utilité limitée dans le temps, volume potentiellement élevé — premier poste à purger pour rester dans le plan gratuit. |
| **Journal d'audit — actions sensibles** | Accès à une donnée santé, changement de rôle, suppression de compte, correction de points Legacy, export nominatif (section 11.3 du CDC) | Rétention longue (proposition : 3 ans) | Archivage froid uniquement, pas de purge automatique avant cette échéance | Sa raison d'être est la traçabilité en cas de litige ou de contrôle — le purger au même rythme que les logs techniques affaiblirait l'exigence même qui le justifie. |
| **Comptes désactivés** | Profil, historique, participation | 12 mois après désactivation | **Pseudonymisation**, pas suppression totale | Objectif : effacer le caractère identifiant (nom, contact, santé) tout en conservant, si le club le souhaite, une trace statistique agrégée (ex. saisons jouées, historique de points Legacy) non ré-identifiable. |
| **Données financières (cotisations, section 4 du CDC)** | Échéanciers, statuts de paiement | Durée légale de conservation comptable (à faire confirmer par le trésorier/expert-comptable du club — variable selon obligations associatives françaises) | Archivage froid obligatoire avant toute purge | Contrainte légale potentiellement plus longue que les autres catégories — **ne pas appliquer les durées ci-dessus sans validation comptable.** |
 
## 3. Stratégie d'archivage froid
 
Avant toute purge définitive, un instantané est exporté hors de la base active. Trois options, du plus simple au plus robuste :
 
| Option | Coût | Avantages | Limites |
|---|---|---|---|
| **Dépôt GitHub privé dédié** (`as-caribbean-archives`) | Gratuit | Simple à mettre en place, versionné, accessible aux mêmes titulaires que le reste du projet (cf. `GOUVERNANCE.md`) | Pas conçu pour des volumes importants ; à réserver à des exports périodiques raisonnables (dump SQL compressé, CSV) |
| **Google Drive du club** | Gratuit dans la limite du quota du compte club | Accessible sans compétence technique par le président/Bureau, bon complément « lisible par un humain » | Moins adapté à un format brut (SQL) qu'à des exports CSV/PDF résumés |
| **Stockage objet externe** (ex. Cloudflare R2, free tier généreux) | Gratuit jusqu'à un volume conséquent | Pensé pour ce type d'usage, pas de dépendance à un compte personnel | Un outil de plus à gouverner (cf. registre des comptes) — à n'introduire que si le volume dépasse les deux options précédentes |
 
**Recommandation** : démarrer avec le dépôt GitHub privé dédié — il ne rajoute aucun outil ni compte supplémentaire au registre de gouvernance, et un dump SQL compressé mensuel d'un club de cette taille restera de toute façon très en dessous des limites de taille de dépôt GitHub. Réévaluer vers Cloudflare R2 uniquement si le volume archivé devient significatif après plusieurs années.
 
Format d'export recommandé : `pg_dump` au format compressé pour un instantané complet et réimportable tel quel dans n'importe quel Postgres (garantie de réversibilité maximale), complété d'exports CSV ciblés pour les catégories que le Bureau souhaite pouvoir consulter sans compétence technique.
 
## 4. Cas particulier : données de santé
 
Contrairement aux autres catégories, les données de santé purgées **ne sont pas conservées en clair dans l'archive froide**. Deux options à trancher avec le référent RGPD :
 
- Ne pas archiver du tout la donnée de santé elle-même (purge sèche), en ne conservant que la trace dans le journal d'audit des actions sensibles (qui, quand, quelle action — sans le contenu médical) ;
- Ou archiver sous forme chiffrée avec une clé distincte, non détenue par le mainteneur technique.
Ce point ne doit pas être tranché unilatéralement côté développement — il relève directement de la décision n°5 déjà identifiée comme ouverte dans le CDC (section 22).
 
## 5. Implémentation technique
 
- **Marquage** : chaque table concernée porte une colonne `expires_at` ou `deactivated_at` selon le cas, posée au moment de la création/désactivation de l'enregistrement plutôt que calculée à la volée.
- **Exécution** : un job planifié unique gère l'ensemble du cycle plutôt que des mécanismes séparés :
  1. Ping de l'API Supabase (évite la mise en pause du projet après 7 jours d'inactivité sur le plan gratuit) ;
  2. Export d'archivage froid des enregistrements arrivant à échéance ;
  3. Purge ou pseudonymisation effective ;
  4. Journalisation de l'exécution elle-même dans le journal d'audit (une purge est une action sensible).
- **Outil** : workflow GitHub Actions planifié (`cron`), gratuit dans la limite des minutes incluses pour un dépôt privé de cette taille. Alternative équivalente : extension `pg_cron` directement dans Supabase.
- **Stockage fichiers** : les documents (certificats, justificatifs) vivent dans Supabase Storage, pas dans la base relationnelle. Le job de purge doit supprimer explicitement le fichier associé en plus de la ligne en base — supprimer uniquement la ligne ne libère aucun quota de stockage.
## 6. Ce qui reste à valider avant implémentation
 
Ce document pose une base de discussion technique, pas des décisions définitives. Avant tout développement du job de purge :
 
1. **Durées de rétention des données de santé** — à valider avec le référent RGPD (CDC section 22, décision n°5).
2. **Durée de conservation des données financières** — à faire confirmer par le trésorier au regard des obligations comptables associatives.
3. **Désignation du référent RGPD** — condition préalable à la validation de ce document dans son ensemble (cf. `GOUVERNANCE.md`, section 7).
4. **Choix définitif du support d'archive froide** — la recommandation de la section 3 (dépôt GitHub privé) est un point de départ, à confirmer une fois un ordre de grandeur réel du volume de données disponible.