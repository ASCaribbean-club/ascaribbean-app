import { DomainError } from './domain-error'

// specs/web-users.md §2.5/AC-WU-34 — "échec de l'insertion de la ligne
// public.users APRÈS une invitation réussie": the invite-user Edge
// Function's auth.admin.inviteUserByEmail() call succeeded (an email was
// sent, an auth.users row exists) but the immediate public.users insert
// that follows it (§2.5 point 3) failed. Named EXPLICITLY, per the spec's
// own wording ("la fonction doit renvoyer une erreur explicite et nommée
// plutôt que laisser l'appelant croire à un succès") — never surfaced as a
// generic failure, since the invitation genuinely did go out even though
// no directory row backs it yet.
export class UserDirectoryInsertFailedError extends DomainError {}
