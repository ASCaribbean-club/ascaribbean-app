-- specs/mobile-treasurer.md — amendement du 2026-10-05 (4), PO-TR-01(c) :
-- relances de cotisation et alerte in-app du membre. §C (modèle de données),
-- §D (RLS), §F (rétention). Migration à PROPOSER à l'application, jamais
-- appliquée en silence.
--
-- Deux tables aux rôles distincts, volontairement non fusionnées (même
-- distinction que ConvocationResponse / AttendanceRecord, CLAUDE.md §6) :
--   - public.dues_reminders : HISTORIQUE append-only des relances ;
--   - public.notifications  : ÉTAT COURANT de l'alerte d'un destinataire
--     (upsert sur conflit : une nouvelle relance ré-arme la ligne).
-- Les deux ne sont écrites que par public.send_dues_reminders()
-- (20261005170200_send_dues_reminders.sql, SECURITY DEFINER) : aucune
-- politique d'écriture n'existe pour `authenticated`, Trésorier et admin
-- compris. Une politique INSERT sur notifications permettrait au Trésorier
-- d'écrire n'importe quelle notification à n'importe qui, sans règle
-- d'éligibilité ni fenêtre de 7 jours.

-- =========================================================================
-- 1. public.dues_reminders — historique append-only (§C)
-- =========================================================================
create table public.dues_reminders (
  id uuid primary key default gen_random_uuid(),
  -- `on delete cascade`, comme membership_payments.
  membership_id uuid not null references public.memberships (id) on delete cascade,
  -- Lu depuis auth.uid() par la fonction d'envoi, jamais reçu en paramètre.
  sent_by uuid not null references public.users (id),
  sent_at timestamptz not null default now(),
  -- §F — durée de conservation comptable non confirmée (PO-TR-16) : nullable,
  -- aucune valeur posée. Aucune logique d'expiration dans domain/.
  expires_at timestamptz
);

comment on table public.dues_reminders is
  'Historique append-only des relances de cotisation (specs/mobile-treasurer.md amendement 4, §C). Écrit uniquement par send_dues_reminders(). Donnée financière : rétention PO-TR-16 ouverte.';

-- Lecture agrégée de get_treasurer_dues() (count / max(sent_at) par adhésion)
-- et fenêtre anti-relance de send_dues_reminders().
create index dues_reminders_membership_sent_at_idx
  on public.dues_reminders (membership_id, sent_at desc);
-- Index sur la clé étrangère sent_by (schema-foreign-key-indexes).
create index dues_reminders_sent_by_idx on public.dues_reminders (sent_by);

alter table public.dues_reminders enable row level security;
-- AUCUNE politique pour `authenticated` : ni select, ni insert, ni update, ni
-- delete. La lecture passe par get_treasurer_dues() (agrégat), l'écriture par
-- send_dues_reminders(), toutes deux SECURITY DEFINER. Les privilèges de table
-- par défaut de Supabase sont retirés explicitement (moindre privilège).
revoke all on public.dues_reminders from anon, authenticated;

-- =========================================================================
-- 2. public.notifications — état courant de l'alerte (§C)
-- =========================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id) on delete cascade,
  -- Un seul type pour l'instant. Mirroir manuel (CLAUDE.md §7) de
  -- domain/entities/notification.ts NotificationKind.
  kind text not null constraint notifications_kind_check check (kind in ('dues_reminder')),
  membership_id uuid references public.memberships (id) on delete cascade,
  -- Date de la DERNIÈRE relance (réarmée à chaque envoi).
  sent_at timestamptz not null default now(),
  -- null = non lu = alerte affichée (si elle est toujours pertinente, §H).
  read_at timestamptz,
  -- §F / AC-TR-44 — posée à la création et au réarmement par la fonction
  -- d'envoi (proposition : sent_at + 12 mois). Seul le job de purge Supabase
  -- (non construit dans cette passe) la lit, jamais domain/.
  expires_at timestamptz not null default (now() + interval '12 months'),
  -- membership_id est requis pour le type 'dues_reminder'.
  constraint notifications_dues_reminder_membership_check
    check (kind <> 'dues_reminder' or membership_id is not null),
  -- Une seule ligne par (destinataire, type, adhésion) : upsert sur conflit.
  constraint notifications_recipient_kind_membership_key unique (recipient_id, kind, membership_id)
);

comment on table public.notifications is
  'État courant de l''alerte d''un destinataire (specs/mobile-treasurer.md amendement 4, §C). Aucun montant, aucun texte, aucun nom d''expéditeur : le montant affiché est lu en direct côté membre. Écrit uniquement par send_dues_reminders() ; le membre ne modifie que read_at.';

-- Index sur la clé étrangère membership_id (recipient_id est déjà couvert par
-- la contrainte unique ci-dessus, colonne de tête).
create index notifications_membership_id_idx on public.notifications (membership_id);

alter table public.notifications enable row level security;

-- 'notifications_select_own' — RLS seule, aucune entrée de matrice (§D) : le
-- membre ne lit que ses propres lignes. (select auth.uid()) pour que la
-- valeur soit évaluée une fois par requête (security-rls-performance).
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

-- 'notifications_update_own_read' — « Masquer » pose read_at sur sa propre
-- ligne. La restriction à la seule colonne read_at est portée par le
-- privilège de colonne ci-dessous (la politique ne filtre pas les colonnes).
create policy notifications_update_own_read on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- Aucune politique INSERT/DELETE pour `authenticated` (Trésorier et admin
-- compris). On retire les privilèges par défaut puis on n'accorde que le
-- strict nécessaire : lecture, et mise à jour de read_at uniquement.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
