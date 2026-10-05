-- specs/profile-membership-dues.md §2.2/AC-PMD-16 — adds exactly one column to
-- public.seasons: payment_url, the external page where members pay this
-- season's cotisation (a plain redirect shown on "Mon profil"; the app
-- collects nothing). Nullable, no default: a season without a link is a
-- normal state and the link is then simply absent from the profile.
--
-- Written by seasons_insert_admin / seasons_update_admin
-- (20260917122358_web_seasons_write_policies.sql), i.e. 'season:write' =
-- admin only — no policy is created or changed for this column, same
-- reasoning as seasons.cotisation_amount
-- (20260918075726_seasons_cotisation_amount_column.sql). Read by every
-- authenticated account through the existing seasons_select_authenticated
-- (`using (true)`); a configuration value, neither nominative nor financial.
-- Frozen like every other column once the season has ended (the update
-- policy requires end_date >= current_date).
--
-- CHECK mirrors normalizePaymentUrl() in
-- src/domain/rules/dues-payment-link-rules.ts (the validation of
-- CreateSeasonUseCase / UpdateSeasonUseCase, InvalidSeasonInputError) —
-- change both together (CLAUDE.md §7): https scheme only (case-insensitive),
-- no whitespace anywhere, at most 2048 characters. An empty string is
-- refused (the domain normalizes it to null before writing). public.
-- current_season() returns the seasons row type, so it exposes the new
-- column without being redefined.
alter table public.seasons
  add column payment_url text
    constraint seasons_payment_url_check
    check (
      payment_url is null
      or (payment_url ~* '^https://[^[:space:]]+$' and char_length(payment_url) <= 2048)
    );

comment on column public.seasons.payment_url is
  'External payment page for this season''s cotisation (https only, <= 2048 chars). Null = no link shown on the member profile.';
