# Spec — Legacy points catch-up ("rattrapage de points")

> Module: **ASC Legacy, P1** (`docs/priorisation-fonctionnelle-as-acaribbean.md`, "points, badges, avantages"; CDC §8). The CDC's non-negotiable audit trail (§11.3) names "correction points Legacy".
> **Extends `docs/specs/asc-legacy.md`.** Every PO-LG-*, AC-LG-* and §4.x reference below points to that spec and is not restated here. New ids use the `LPC` prefix (PO-LPC, AC-LPC, OPEN-LPC).
> Status: functional and domain spec. Decisions PO-LPC-01…06 were taken with the developer and are final. Findings in §2 were checked in the code and migrations, not assumed.
> Mockup: none. `docs/designs/DESIGN_LINKS.md` §4 has **no row** for this feature (nor for `asc-legacy`). The only Legacy snapshot is the player screen `docs/designs/asc-legacy/[v2] [Joueur] Mob - ASC Legacy.png`, which does not cover entry. Per the registry workflow, the developer is asked once for a link (see the handoff message). No row was added by this pass because no link was obtained.

---

## 1. Scope

**In scope.** A new **manual** référentiel rule `points_catchup` ("Rattrapage de points"), used to load the starting balances of members for the club's **two seasons before go-live**, one entry per player, through the existing manual award flow (PO-LG-08, §4.9).

**Out of scope.**
- Bulk entry, CSV import, and a one-off SQL import (PO-LPC-04).
- Any change to the points mode logic (PO-LPC-06), to tiers, to reward grants or to the correction flow (PO-LG-18).
- A new RBAC action or permission (PO-LPC-05).
- Membership seniority for pre-go-live seasons: that is PO-LG-25 (memberships entered through existing admin means), not this feature.

### Decisions (final)

| ID | Decision |
|---|---|
| PO-LPC-01 | A manual référentiel rule `points_catchup` is added to Legacy, French label **"Rattrapage de points"**. |
| PO-LPC-02 | Variable points, **1..300** per entry. **The minimum is 1, not 0.** The reason is mandatory free text (e.g. "saison précédente", "bug"), as for every manual award (PO-LG-19). |
| PO-LPC-03 | The entry carries a date of the fact (`earned_on`) **and a season chosen by the actor**. The date must fall inside that season's `season_range`, and that season must be fully configured (`legacy_season_settings` row **and** at least one tier, i.e. `private.legacy_season_is_configured`), even if it has no convocation. Otherwise the entry is refused with an explicit message. |
| PO-LPC-04 | One entry per player. No bulk entry. |
| PO-LPC-05 | Same roles as other manual awards (`legacy:award`, PO-LG-09 / PO-LG-23). No new action, no new permission. |
| PO-LPC-06 | No change to the mode logic: in `cumulative`, a catch-up dated in a past season counts toward the current season's balance, tiers and rewards; in `per_season`, it counts only for its own season. |

---

## 2. Findings in the existing code (verified)

### 2.1 PO-LG-16 guard on manual entries

- **TypeScript: enforced.** `AwardLegacyPointsUseCase` (`src/domain/usecases/legacy/AwardLegacyPointsUseCase.ts`) derives the season from `earnedOn` (`seasonRepository.findAll()`, inclusive range), throws `LegacySeasonNotConfiguredError` when the date is in no season or when `isSeasonConfigured(mode, tiers)` is false. This runs after `validateManualAward`.
- **SQL: not enforced.** There is **no award RPC**: a manual award is a direct insert under the RLS policy `legacy_points_entries_insert_award`, which calls only `private.legacy_manual_award_is_valid(rule_id, points, earned_on)` (manual channel, rule valid at `earned_on`, points check). Neither calls `private.legacy_season_is_configured`. The use case header states it: "RLS refuses the same cases on the SQL side (AC-LG-07), except PO-LG-16 which only this use case enforces."
- **Where the new checks go:**
  - "date inside the **chosen** season" (PO-LPC-03) is new. The use case today has no season input; it must receive the chosen season id and check `season.startDate <= earnedOn <= season.endDate` (inclusive, same convention as `seasons.season_range '[]'`) **before** the configuration check, then run the existing configuration check on that season.
  - Because seasons cannot overlap (exclusion constraint on `season_range`), the season containing `earned_on` is unique. The chosen season is therefore **an input to validate, not a stored column**: the season of an entry stays derived from `earned_on` (PO-LG-01). Storing it would also break `legacy_points_entries_source_shape_check`, which requires `season_id is null` for `source = 'manual'`.
  - SQL mirror of the configuration check: see OPEN-LPC-03.

### 2.2 Tier crossed by a catch-up

- Tier eligibility is **computed at read time, never stored** (PO-LG-07): `GetLegacyOverviewUseCase` computes `computeTierStatus` on the **current** season's tiers, then `rewardsStatus` for every reached tier.
- A reward is **never granted automatically.** `legacy_reward_grants` rows are only inserted by a client under `legacy_reward_grants_insert_grant` (Dirigeant habilité, Trésorier, Administrateur). `20261014140749_legacy_tiers_propagation.sql` only copies or upserts **tier definitions** (`save_legacy_tiers`, `legacy_copy_tiers_to_new_season`); it never writes a grant.
- **Consequence:** in a `cumulative` current season, a catch-up that lifts a player over a threshold makes that tier "reached" immediately, and it appears as **"à remettre"** for the current season until someone records the handover. Grants are keyed per (user, tier, season) (PO-LG-16), so a reward physically handed over in a past season does **not** count for the current one. Loading the catch-ups may therefore produce many "à remettre" rewards at once. See OPEN-LPC-02.
- The team leaderboard (`get_team_legacy_leaderboard`) sums entries with the same mode predicate, so catch-ups count there too, with no change needed.

### 2.3 Action vocabulary (schema and TypeScript)

The new action is refused today. Every place to change:
- `legacy_rules_action_check` (`20261013134443_legacy_schema.sql` line 55): add `points_catchup`.
- `legacy_rules_action_channel_check` (same file, line 66): add `points_catchup` to the **manual** list only.
- Other CHECKs already accept the new rule: `legacy_rules_team_type_null_check` (manual means null team type, PO-LG-23), `legacy_rules_points_shape_check` (variable, `points` null, `max_points` 300 > 0), `legacy_rules_automatic_fixed_check` (manual may be variable).
- TypeScript: `LEGACY_ACTIONS` in `src/domain/entities/legacy.ts` (mirror of the CHECK), and `LEGACY_ACTION_LABELS` in `src/presentation/shared/formatters/legacy-labels.ts` (a `Record<LegacyAction, string>`, so the compiler requires the label).
- **Seed:** the rule row (`points_catchup`, team type null, channel `manual`, kind `variable`, `max_points` 300, `reason_required` true, `valid_from` see OPEN-LPC-04) is inserted by a **new migration, proposed to the developer and never applied without her approval**. Migrations already applied are never edited.

### 2.4 Bounds, zero, negatives and reason

| Point | Covered today? |
|---|---|
| Negative points | **Yes.** Refused for variable rules in TS (`validateManualAward`: `points < 0`) and SQL (`legacy_manual_award_is_valid`: `between 0 and max_points`). |
| Maximum 300 | **Yes**, through `max_points = 300` on the rule, in both TS and SQL. |
| Minimum 1 (zero refused) | **No.** Both sides use a **0** floor for every variable rule (spec asc-legacy §3.1 "the minimum is 0"; `exceptional_commitment` is 0–50). The table only forbids zero for corrections (`legacy_points_entries_correction_check`). A 0-point catch-up would be accepted today. A floor of 1 must be added for `points_catchup` in **both** `validateManualAward` and `legacy_manual_award_is_valid` / RLS, **without** changing the 0 floor of `exceptional_commitment`. The mechanism (generic minimum on the rule, or a rule-specific branch) is a Mentor decision. |
| Reason mandatory | **Yes**, for every manual entry, independently of the rule: TS `validateManualAward` (`reason.trim()` empty) and SQL `legacy_points_entries_source_shape_check` (`length(btrim(reason)) > 0`). The `reason_required` column is **not read** by either validator; it is seeded `true` for consistency with the other manual rules. |
| UI bounds | The admin award dialog (`useAwardPointsDialogViewModel`) hard-codes `points >= 0` and the label "0 à {max} pts". It must reflect the minimum of 1 for this rule. |

### 2.5 Audit

- Manual awards already emit **`legacy_points.awarded`** from `AwardLegacyPointsUseCase`, after the insert, with metadata `{ userId, ruleAction, points, earnedOn }` (no reason text, no name). `record_audit_log_entry` allows it for Administrateur and Dirigeant habilité (`20261013134924_legacy_audit.sql`).
- **The catch-up reuses it unchanged.** It is told apart in the audit log by `metadata.ruleAction = 'points_catchup'`. No new audit code, no guard change.

### 2.6 Entry surface today

- The only award UI built is the **web backoffice** dialog (`features/backoffice/legacy/AwardPointsDialog`), and the backoffice is gated by `backoffice:access`, which is Administrateur only. The Dirigeant habilité mobile award screen (asc-legacy §6.2) is not built. In practice, the Administrateur enters catch-ups until that screen exists; RBAC still allows the Dirigeant habilité (PO-LPC-05).

---

## 3. RBAC

No change. From asc-legacy §5 and PO-LG-23:

| Role | Interaction with the catch-up |
|---|---|
| Administrateur | Create (`legacy:award`, club-wide). Read any (`legacy:read_any`). |
| Dirigeant habilité | Create (`legacy:award`, club-wide). Read any (`legacy:read_any`). No mobile entry screen exists yet (§2.6). |
| Joueur / Joueuse | Read own entries only (`legacy:read_own`, RLS `legacy_points_entries_select_own`). Sees the entry and its reason in their history (asc-legacy §6.1). |
| Trésorier | No access to entries. Only affected through the rewards "à remettre" (§2.2); its read access is the open RBAC point of asc-legacy §5, unchanged here. |
| Coach/Staff, Responsable de section, Référent médical, Bénévole | Own entries only, as players. |

A catch-up, like any manual award, cannot be edited or deleted (PO-LG-01). A mistake is fixed by a correction, which only the Dirigeant habilité can create (PO-LG-18).

---

## 4. Sensitive data

- **No health data. No financial data** in the ledger. The cotisation discount attached to a tier is informational and owned by the Cotisations module (PO-LG-07); a catch-up can move a player into a discounted tier, but nothing is applied here.
- **Audit required**, and already in place: `legacy_points.awarded`, emitted from the use case (§2.5).
- The reason is free text visible to the player. It must not contain personal or medical details; no new rule enforces this, same as other manual awards.

---

## 5. Acceptance criteria

| ID | Given / When / Then |
|---|---|
| AC-LPC-01 | **Given** the seed migration is applied, **when** the rules are read, **then** exactly one current `points_catchup` rule exists, manual channel, variable, max 300, null team type, reason required, and it appears in the list of manual rules offered for a date inside either past season. |
| AC-LPC-02 | **Given** an Administrateur or a Dirigeant habilité, a player, a configured season S and a date inside S, **when** they record a catch-up of 150 pts with a reason, **then** one manual-source ledger entry of +150 with `earned_on` = that date is written, and one `legacy_points.awarded` audit row with `ruleAction = 'points_catchup'` exists. |
| AC-LPC-03 | **Given** a catch-up, **when** the points are 0, negative, above 300, or not an integer, **then** it is refused by the use case **and** by RLS (direct insert with the actor's token). |
| AC-LPC-04 | **Given** a catch-up with an empty or blank reason, **then** it is refused (use case and table CHECK). |
| AC-LPC-05 | **Given** a chosen season S, **when** the date of the fact is outside S's range (boundary days included in S), **then** the entry is refused with an explicit message saying the date is not in the chosen season. |
| AC-LPC-06 | **Given** a chosen season with no `legacy_season_settings` row, or with no tier, **when** a catch-up is submitted for a date inside it, **then** it is refused with the "season not configured" message, even if the season has no convocation; **given** the same season once configured, **then** it is accepted even with no convocation. |
| AC-LPC-07 | **Given** a catch-up dated in a past season and a current season in `cumulative`, **then** it counts in the current balance, tier status and leaderboard; **when** the current season is switched to `per_season`, **then** it no longer counts in the current balance, with no ledger change. |
| AC-LPC-08 | **Given** a catch-up that lifts a player over a tier threshold of the current season, **then** that tier shows "à remettre" and **no** reward grant row is created. |
| AC-LPC-09 | **Given** a role without `legacy:award` (e.g. Coach/Staff, Trésorier, Joueur), **when** it submits a catch-up through the use case or a direct insert, **then** it is refused. |
| AC-LPC-10 | **Given** `exceptional_commitment`, **when** 0 points are submitted, **then** it is still accepted as today (the new minimum applies to `points_catchup` only). |
| AC-LPC-11 | `validateManualAward` has Vitest coverage for the `points_catchup` bounds (0 rejected, 1 and 300 accepted, 301 rejected), and the use case has coverage for the chosen-season checks (date outside, not configured, no convocation). The SQL counterpart is named in a comment on both sides. |

---

## 6. Open questions

| ID | Question | Decides | Blocks |
|---|---|---|---|
| **OPEN-LPC-01** | **Double counting when the past seasons are configured.** Configuring a past season (PO-LPC-03) also makes it eligible for (a) the daily job `private.award_legacy_season_end_bonus`, which will add **+50 to every player with an `active`, non-archived membership** in that season (memberships for pre-go-live seasons are entered by hand, PO-LG-25), and (b) `run_legacy_backfill`, if it is run without a season filter or on that season, for any closed convocation dated in it. Does the catch-up amount **include** the season-end bonus (and any convocation points) for those seasons, or should these be prevented for the past seasons? Ledger entries are append-only, so a wrong load can only be undone by corrections. | Developer + Bureau | Loading real catch-ups in production. Not the design. |
| OPEN-LPC-02 | Is it expected that loading the catch-ups immediately produces "à remettre" rewards in the current season (§2.2), including for tiers whose reward was physically handed over before go-live? Grants per (user, tier, season) are PO-LG-16 and are not reopened here; the question is only whether the Bureau accepts this effect or wants the past handovers recorded first. | Bureau | Nothing technical. |
| OPEN-LPC-03 | Should the PO-LG-16 configuration check be mirrored in RLS (`legacy_points_entries_insert_award` calling `private.legacy_season_is_configured(earned_on)`)? Today only the use case enforces it, for every manual award (§2.1). Adding it would apply to all manual awards, which matches the current TypeScript behaviour. The "date inside the chosen season" check cannot be mirrored in RLS since the season is not stored, and needs no mirror (the season is derived from the date). | Mentor / developer | Nothing. |
| OPEN-LPC-04 | `valid_from` of the seeded rule. It must be on or before the start of the earliest of the two past seasons, or every catch-up is refused as "rule not valid at the date". The existing seed used the earliest season start at migration time; if the past seasons are not yet in `seasons` when the migration runs, a fixed date is needed. Which date, and are both past seasons already created? (Only `valid_to` can be edited afterwards.) | Developer | The seed migration. |
| OPEN-LPC-05 | Should `points_catchup` appear on the player's "Comment gagner des points" page (PO-LG-21), which lists the référentiel readable by all? It is not a way to earn points going forward. The page is not built yet. | Developer | Nothing now; that page's build. |
| OPEN-LPC-06 | Message mapping: `InvalidLegacyInputError` is mapped in `map-domain-error-to-ui-error.ts` to a **tiers-specific** message ("rangs consécutifs, …"). The new "date not in the chosen season" and "points 1..300" refusals need explicit messages (PO-LPC-03); whether that means a new error type or a mapping by cause is an implementation choice. Pre-existing gap for other manual awards too. | Developer | Nothing. |

Carried, not resolved here: Trésorier read access (asc-legacy §5), and AC-MN-05 for the Menu (asc-legacy §8).

---

## 7. UI design

### 7.1 References

- **No mockup exists for this feature.** `docs/designs/DESIGN_LINKS.md` §4 has no row for it (nor for `asc-legacy`) and `docs/designs/` holds no Legacy entry screen; no link is invented here. The design is a composition of the already-built dialog `src/presentation/features/backoffice/legacy/components/AwardPointsDialog.tsx` (view-model `useAwardPointsDialogViewModel.ts`), plus one extra field. No new visual pattern, so no Claude Design prototype is requested.
- Existing flow reused: `docs/specs/asc-legacy.md` PO-LG-08 / §4.9 (manual award = player, date, manual rule valid at that date, points, mandatory reason).

### 7.2 Where it lives

- **Not in the 4-entry bottom nav.** The only award surface built is the web backoffice (`Backoffice > Legacy > Points` tab, "Attribuer des points" button opening `AwardPointsDialog`), reachable by the Administrateur only (§2.6). The nav constraints do not apply and no nav item is added.
- The catch-up is **a rule choice inside the same dialog**, not a new screen, button or dialog. The Dirigeant habilité mobile award screen (asc-legacy §6.2) is still not built; when it is, it must reuse the same field rules below.
- Entry is one player at a time, by repeating the dialog (PO-LPC-04). No bulk affordance.

### 7.3 Role differences

Reuses §3, nothing redefined. Administrateur: sees and uses the dialog. Dirigeant habilité: RBAC allows it, no UI yet. All other roles: no award UI at all (the backoffice entry is hidden by `backoffice:access`; no disabled state). The player sees the resulting entry and its reason in their existing Legacy history (no player-side UI change).

### 7.4 Dialog changes (field by field)

Field order stays: Joueur, Date du fait, Action, [Saison], Points, Motif. All controls keep `h-11` (Textarea `min-h-20`), each field wrapper keeps `min-w-0`, same labels style. The dialog stays single-column, so there is **no side-by-side pair** to add; if the developer later puts Date and Saison on one row, each item must carry `min-w-0` and shrink to its column (native date input has an intrinsic floor), checked at a real phone viewport.

1. **Action** select: "Rattrapage de points (1 à 300 pts)" appears in the list like any manual rule valid at the chosen date. Its label range comes from the rule's real minimum, so the hard-coded "0 à {max} pts" in `ruleOptions` must become "{min} à {max} pts" (min 1 for this rule, still 0 for `exceptional_commitment`). The helper text under the select is unchanged.
2. **Saison (new, conditional).** Shown **only when the selected rule is `points_catchup`**, between Action and Points, same `Select` / `SelectTrigger h-11 w-full min-w-0 rounded-xl` as Joueur. Label "Saison". Placeholder "Choisir une saison". Options: all seasons, labelled by name, past seasons included, most recent first. Helper text: "La date du fait doit appartenir à cette saison." No default selection (the actor must choose, PO-LPC-03). Selecting a season does not change the date; selecting a date does not auto-pick the season, so the two stay independent and the refusal below stays reachable. Reset to empty if the rule changes away from catch-up and back (remounted per opening, as today).
   - Options are not filtered by "fully configured": filtering would hide the reason. A season that is not configured is refused at submit with the explicit message (below).
3. **Date du fait**: unchanged control. Once a season is chosen, show the season's range as helper text under the date ("Saison 2024-2025 : du 01/07/2024 au 30/06/2025"), so the actor sees the bounds without a hard `min`/`max` on the input (no native blocking, so the explicit refusal stays the single source of the message). Note the rule list depends on this date (`manualRulesValidOn`): a date before the rule's `valid_from` simply hides "Rattrapage de points" (OPEN-LPC-04 decides whether that can happen for the two past seasons).
4. **Points**: label becomes "Points (1 à 300)" for this rule ("Points ({min} à {max})" generically). Input `min` is the rule minimum (1), not the hard-coded 0, `step="1"`, `inputMode="numeric"`. `isPointsValid` in the view-model uses the same minimum, so 0 keeps the submit disabled for catch-up and stays valid for `exceptional_commitment` (AC-LPC-10). Disabled submit gives no message of its own; the bound is shown in the label.
5. **Motif**: unchanged, mandatory. For this rule, placeholder example "Ex. : saison précédente" and helper kept ("Visible par le joueur dans son historique."). Add no personal or medical details guidance beyond the existing helper (§4).
6. **Submit** `canSubmit` additionally requires a chosen season when the rule is `points_catchup`. Button labels unchanged ("Attribuer" / "Attribution…"); the primary button keeps the existing green style.

### 7.5 States and refusal messages

Refusals keep the current pattern: a destructive `Alert` (`role="alert"`) at the top of the form, dialog stays open, field values kept. Because of OPEN-LPC-06 (the current `InvalidLegacyInputError` maps to a tiers-specific message and would mislead), **each refusal below needs its own explicit message**; the mechanism (new error types or mapping by cause) is left to implementation:

| Case | Message (French, final wording to confirm) |
|---|---|
| Date outside chosen season (AC-LPC-05) | "La date choisie n'appartient pas à la saison sélectionnée ({début} – {fin})." |
| Season not configured (AC-LPC-06) | "La saison sélectionnée n'est pas configurée (mode de points et paliers). Configurez-la avant d'enregistrer un rattrapage." |
| Points out of bounds or not an integer (AC-LPC-03) | "Le rattrapage doit être un nombre entier de points entre 1 et 300." |
| Empty reason (AC-LPC-04) | "Le motif est obligatoire." |
| Rule not valid at the date | existing message, unchanged |

Order of checks matches the use case: points and reason, then date in chosen season, then season configured. Loading: fields and buttons disabled, button reads "Attribution…". Success: dialog closes, Legacy queries are invalidated, the entry appears in the ledger table (existing behaviour, no toast added).

### 7.6 Ledger and audit display

- The ledger/points table shows the entry with action label "Rattrapage de points" via `LEGACY_ACTION_LABELS` (compiler-enforced). No new column. The "Saison" shown for a manual entry is derived from `earned_on` as today (PO-LG-01), not stored.
- The audit label for `legacy_points.awarded` is unchanged; the catch-up is distinguishable only by `metadata.ruleAction`. No audit UI change.
- Nothing is shown to warn about "à remettre" rewards after loading (OPEN-LPC-02) in this pass.

### 7.7 Open UI questions (design chosen, flagged, not resolved)

- **UI-LPC-01.** Season select lists every season, configured or not, and relies on the refusal message. Alternative (show non-configured seasons with a "non configurée" suffix) is cheap but extra; left to the developer. Related to OPEN-LPC-01/03.
- **UI-LPC-02.** Because entry is one player per dialog, loading two seasons for a whole roster means many reopenings with the same season and similar reasons. A "Enregistrer et saisir un autre" button (keeping season, date and reason) would help but is bulk-adjacent and contradicts the spirit of PO-LPC-04; not designed, to be decided by the developer.
- **UI-LPC-03.** The dialog is a web desktop pattern (`sm:max-w-[480px]`); the mobile-only rule of CLAUDE.md §6 is applied to its controls, but whether the backoffice is ever used on a phone is not established. If the future Dirigeant mobile award screen is built, it needs its own mockup request.
- **OPEN-LPC-04** (seed `valid_from`) affects whether the rule is selectable for the oldest season's dates; **OPEN-LPC-05** is not a UI concern for this pass; **OPEN-LPC-01/02** do not change this design.

---

**Handoff to designer-agent: ready.** No open point blocks design: the entry reuses the existing manual award flow, with a season choice and a 1..300 value for this rule. **OPEN-LPC-01 blocks loading real catch-ups in production** (not design or development), and OPEN-LPC-04 must be answered before the seed migration is written.
