-- specs/mob-notifications.md AC-NT-07, AC-NT-37, AC-NT-42, PO-NT-34 — un
-- téléphone = un utilisateur : la déconnexion ne supprime plus l'abonnement,
-- et la connexion d'un autre compte reprend ou libère l'appareil.
--
-- Reprise (règle A) : DÉJÀ couverte par public.upsert_push_subscription()
-- (migration 20261015120457) : security definer, on conflict (endpoint) do
-- update set user_id = auth.uid(). Rien à ajouter.
--
-- Libération (PO-NT-34) : manquante. La RLS « propre ligne » ne permet pas de
-- supprimer la ligne d'un autre compte ; cette fonction le fait, de façon
-- bornée : appelant pris dans auth.uid() (jamais en paramètre), seul l'endpoint
-- que l'appareil présente est visé, uniquement si la ligne appartient à un
-- AUTRE compte, et rien n'est renvoyé sur ce compte (aucune fuite d'identité).

create or replace function public.release_push_endpoint(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if coalesce(p_endpoint, '') = '' then
    raise exception 'invalid push endpoint' using errcode = '22023';
  end if;

  delete from public.push_subscriptions
  where endpoint = p_endpoint
    and user_id <> v_user;
end;
$$;

revoke all on function public.release_push_endpoint(text) from public, anon;
grant execute on function public.release_push_endpoint(text) to authenticated;
