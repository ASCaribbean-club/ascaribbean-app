# Spec — ASC Legacy (loyalty programme)

> Module: **ASC Legacy, P1** (`docs/priorisation-fonctionnelle-as-acaribbean.md`, "points, badges, avantages, classements"; CDC §8). Rankings are out of scope (see "Out of scope").
> Status: **functional and domain spec.** Decisions PO-LG-01…PO-LG-10 come from a mentoring session and are final. OPEN points are carried as-is with their trigger, never resolved here.
> **Gate (CDC §8): the Bureau validated the points grid and the tiers (confirmed by the developer). No grid point stays open.**
> Mockup: `docs/designs/asc-legacy/[v2] [Joueur] Mob - ASC Legacy.png`, read directly (five states: main, seasons threshold blocking, new member/empty, max tier, loading). No row exists for this feature in `docs/designs/DESIGN_LINKS.md` (the brief named `docs/DESIGN-LINKS.md`; the real registry is `docs/designs/DESIGN_LINKS.md`). Per the brief, no link was requested. Row to be added by whoever next edits the registry (this pass writes only this file): `asc-legacy — vue joueur (5 états) | — aucun lien fourni | 2026-10-08 | docs/designs/asc-legacy/[v2] [Joueur] Mob - ASC Legacy.png | instantané seul`. The `docs/designs/asc-legacy/` folder is untracked in git (`??`) and must be committed with that row.

---

## 0. Schema findings

Inspected in `supabase/migrations/` and `src/domain/entities/`. **There is no `database.types.ts` in the repository**, so the migrations are the only schema source.

### (a) Team type / discipline: exists, but on the section, not the team

- `public.sections.type text not null check (type in ('football', 'esport', 'echecs', 'domino'))` (`20260811171754_initial_schema.sql`), mirrored by `SectionType` in `src/domain/entities/section.ts`.
- `public.teams` has no type column. A team's discipline is reached through `teams.section_id` (`not null` since `20260917145402_section_team_write_policies.sql`) → `sections.type`.
- A convocation's discipline is therefore `convocations.team_id → teams.section_id → sections.type`. This applies to all three convocation types, meetings included (`convocations.team_id` is `not null`).
- **Decided (PO-LG-11):** the team type of an entry is the type associated to the entry (convocation → team → section → `sections.type`). Only the manual-entry sub-question stays in OPEN-LG-01 (§8).

### (b) Match type (friendly vs official): absent

- `public.match_details` has `convocation_id, opponent_id, is_home, meeting_point_time, meeting_point_location, goals_for, goals_against`. There is no competition or match-type column.
- `competition_type` was deliberately **not** added (`20260924100000_match_statistics_schema.sql`, STOP block: 7 existing rows, no backfill value decided). `src/domain/entities/match-details.ts` documents the same gap, and `specs/coach-team-stats.md` PO-CTS-01 depends on it too.
- **Consequence:** `match_attendance_official` and `match_attendance_friendly` cannot be told apart today, so automatic awards for matches are blocked until this column exists. This is carried as **OPEN-LG-12** (§8). The developer decided not to add it in this feature (PO-LG-12), so automatic match awards are deferred.

### (c) audit_log: exists. No Legacy emitter, and one naming collision

- `public.audit_log` is a single table (`20260930125319_web_audit_logs_schema.sql`). It has `occurred_at`, `actor_id` (`on delete set null`), `action text` with a CHECK constraint (`audit_log_action_check`), `target_id` (no FK) and `metadata jsonb`. `target_type` and `source` (`usecase|job|trigger`) were added by `20260930134958_audit_log_target_type_source.sql`. Clients cannot write to it.
- The only application write path is `public.record_audit_log_entry(p_action, p_target_id, p_metadata, p_target_type)`, a SECURITY DEFINER function. Its latest guard (`20261007151442_finances_member_advances.sql`) allows **admin for any code, and treasurer for a fixed list of finance and dues codes only. It does not allow `authorized-officer` at all.**
- The French labels live in `presentation/features/backoffice/audit/audit-action-labels.ts`, and the TypeScript mirror of the codes is `domain/policies/audit-actions.ts`.
- **The code `legacy_points.corrected` already exists** in the CHECK constraint and in `AUDIT_ACTIONS`. It is marked "not wired", and its label is "Correction de points Legacy". It collides with the code proposed by PO-LG-08, `legacy.points_corrected`. Whether to reuse, rename or retire the existing code is a decision for the Mentor agent at migration time. This spec keeps the PO-LG-08 codes as given.
- Consequence for PO-LG-08: emitting `legacy.points_awarded`, `legacy.points_corrected` and `legacy.reward_granted` requires widening the guard of `record_audit_log_entry` to cover Dirigeant habilité and Trésorier for those codes. That widening is part of the later implementation pass, not this spec. Decided (PO-LG-13): `authorized-officer` is allowed.

### (d) Membership seniority: derivable, with caveats

- `public.memberships(user_id, season_id not null, status in ('pending','active','suspended'), valid_until, archived_at, archived_by, amount_due_cents)`.
- The partial unique index `memberships_user_season_active_idx` allows at most one non-archived row per `(user_id, season_id)`.
- Seniority = **number of distinct `season_id` values among a user's memberships**.
- Decided (PO-LG-14): only `active` memberships count, once per distinct season.
- Still not settled: whether archived rows count, whether a membership for a future season counts, and the fact that seasons before the app went live have no membership rows. A long-standing member would be undercounted against Platine's 10-season threshold. This is carried as **OPEN-LG-08**.
- Seasons: `public.seasons(start_date, end_date, season_range daterange '[]')` with a no-overlap exclusion constraint, so a date belongs to at most one season, and there can be gaps. `public.current_season()` resolves "today" against `current_date`.

### (e) Other findings that bear on this spec

1. **Two closure paths.** A convocation closes through the trigger `private.close_convocation_if_complete()` on `attendance_records` writes, or through the pg_cron sweep `private.close_elapsed_convocations()` every 15 min. Both apply only once 6 h have passed since the convocation's start (`20261003165056_delay_convocation_closure.sql`). The award must hook onto the **transition to `closed`**, whichever path causes it.
2. **Attendance can change after closure without a reopen.** The coach update policy `attendance_records_update_validate` has no status or time condition. The admin policies (`…_validate_admin`) explicitly allow corrections after closure (`20261001120000_web_create_convocation.sql`). There is no reopen mechanism in the schema: the convocation spec's §6.3 `ReopenConvocation` is not built, and `convocation-domain-correction.md` is **not in the repository**, as PO-MS-12 already noted. PO-LG-03 computes awards "at closure", so it would not see these edits. Carried as **OPEN-LG-07**.
3. **Deleting convocations.** The only client delete policy is `convocations_delete_coach`: upcoming, `open` convocations only, so none can carry points yet. However, `convocations.team_id` is `on delete cascade` from `teams`, and `attendance_records` is `on delete cascade` from `convocations`. Deleting a team or deleting at database level would remove both the convocation and its attendance facts. This is relevant to **OPEN-LG-04**.
4. **Retroactive convocations** are derived from `created_at >= date` (`20261003165047_retroactive_convocations.sql`). The presence leaderboard excludes them (`…presence_leaderboard_exclude_retroactive.sql`). Legacy **includes** them (PO-LG-04), so the two deliberately diverge.
5. **The Menu entry point does not exist in the repository.** PO-LG-10 refers to an "existing ASC Legacy card in Menu grid (Joueur/Joueuse wireframe)". However, the only Menu mockup in the repo (`docs/designs/menu/[v0] Mob - Menu.png`) has no such card, the built Menu (`presentation/features/menu/`) has none, and `specs/menu.md` AC-MN-05 explicitly **forbids** any Legacy entry or indicator until the Bureau validates the grid. The wireframe PO-LG-10 refers to was not found. See §6.
6. **Earlier specs forbid Legacy indicators:** AC-PD-12 (player dashboard), AC-PR-12 (profile) and AC-MN-05 (menu). This spec does not lift AC-PD-12 or AC-PR-12. It requires AC-MN-05 to be amended only for the Legacy card, and only once the Bureau validates the grid.

---

## 1. Context

ASC Legacy rewards members' commitment to the club over time. Points come from two sources:
- **automatic awards**, derived from coach-confirmed attendance at closed convocations;
- **manual awards** by a Dirigeant habilité or the Administrateur, chosen from a référentiel.

Tiers combine **points** and **membership seniority**. Each tier unlocks a physical reward and a cotisation discount. Handing over a physical reward is recorded as a fact. The cotisation discount itself belongs to the Cotisations module and is not applied here.

### Source barème (initial référentiel data — validated by the Bureau, CDC §8)

| Code | Label (FR, presentation) | Points | Award channel |
|---|---|---|---|
| `training_attendance` | Présence entraînement | 5 | automatic |
| `match_attendance_official` | Présence match officiel (joué ou remplaçant) | 5 | automatic |
| `match_attendance_friendly` | Présence match amical | 2 (set by the developer, PO-LG-24) | automatic |
| `event_participation` | Participation à un événement (tournoi, sortie, réunion, action club) | 3 | automatic for `meeting` convocations, manual otherwise |
| `equipment_setup` | Installation / rangement du matériel | 2 | manual (future automatic via missions, OPEN-LG-05) |
| `club_mission` | Mission envoyée pour le club | 15 | manual (OPEN-LG-05) |
| `referral` | Parrainage d'un nouveau membre | 15 | manual |
| `solidarity_action` | Action solidaire / représentation du club | 20 | manual |
| `partner_contribution` | Apport d'un partenaire / organisation d'événement | 30 | manual |
| `exceptional_commitment` | Engagement exceptionnel validé par le Bureau | variable 0–50, **reason mandatory** | manual |
| `season_end_bonus` | Bonus fidélité fin de saison | +50 | automatic at the season end date (PO-LG-26) |

Each row exists **once per team type** that the Bureau wants to reward (PO-LG-02). Initial data for football only, or for all four types, is not specified here (OPEN-LG-06).

### Initial tiers (club infographic — validated by the Bureau, CDC §8)

| Tier | Min seasons | Min points | Reward | Cotisation discount |
|---|---|---|---|---|
| Bronze | 1 | 200 | Ensemble d'entraînement | −5 % prochaine cotisation |
| Argent | 2 | 400 | Protège-tibias personnalisés + polo | −10 % |
| Or | 3 | 600 | Kit complet d'entraînement | −15 % |
| Émeraude | 5 | 1000 | Ensembles match personnalisés | −20 % |
| Rubis | 7 | 1400 | Bon d'achat 200 € | −30 % |
| Platine | 10 | 2500 | Licence offerte, boutique à vie | −50 % à vie |

---

## 2. Resolved decisions

**PO-LG-01 — Append-only ledger.**
- Points live in an append-only ledger of entries. There is **no UPDATE and no DELETE**. This is the **opposite** of the last-value-wins, upsert-on-conflict pattern used by `ConvocationResponse` and `AttendanceRecord` (CLAUDE.md §6). It must not be "aligned" with them.
- The balance is **never stored**. It is computed at read time, the same principle as ex-PO-CV-05 (`specs/create-convocation.md`, counts computed at read time and never persisted).
- A correction is a **compensating entry** (±points) that references the corrected entry. The original entry is never modified.
- Each entry **snapshots its points** when it is awarded. Changes to the référentiel never alter past entries or balances.
- Each entry has two dates: the **date of the fact** (`earned_on`) and the **creation date**. The season an entry counts towards is always derived from `earned_on`, never from the creation date.

**PO-LG-02 — Externalised, versioned référentiel.**
- Rules live in a table with a validity period `valid_from` / `valid_to`, **never an `is_active` boolean**.
- Rules are **typed by team type**. There is no fallback or default rule: one row per (action, team type). If no rule matches, no points are awarded, and the Administrateur can see that this happened.
  - Why no fallback: a fallback would need a precedence rule duplicated in TypeScript and SQL. Revisit only if duplicating rows across team types becomes painful once a second section is active.
- Resolution key for automatic awards: **convocation type + match type (matches only) + team type + date of the fact**. The rule used is the one valid at `earned_on`, not the one valid when the award is written.
- Friendly matches earn points, possibly fewer, through a **separate rule** `match_attendance_friendly`. This is never implemented as a coefficient in code. Its value is 2 (PO-LG-24).
- A rule has either fixed points, or variable points bounded by a maximum (`exceptional_commitment`: 0–50, reason mandatory).
- Only the Administrateur edits the référentiel.

**PO-LG-03 — Automatic awards.**
- Automatic awards come from the **coach-confirmed `AttendanceRecord`** (`actualStatus = 'present'`), never from the player's `ConvocationResponse`.
- They are computed **when the convocation closes**, not on every `AttendanceRecord` write.
- **Reconciliation by difference:** for a convocation, compute the points each user should have, subtract what that convocation has already awarded them, and insert **only the delta**. The delta can be positive, or negative as a compensating entry.
- This is idempotent, and it also covers an admin reopening and re-closing a convocation (convocation spec §6.3).
- It runs in Postgres, because closure is already SQL-driven. It must also exist as a **pure, tested reference function in `domain/policies/`**, mirrored by hand, following the `convocation-closure.ts` pattern.

**PO-LG-04 — Retroactivity.**
- Awards are retroactive.
- Convocations entered after the fact (admin space) earn points using the rule valid at the date of the fact.
- At go-live, a one-time **backfill** runs the same reconciliation over every convocation that is already closed. There is no special code path for the past.

**PO-LG-05 — Source link.**
- In the domain, the source is a discriminated union: `convocation` (carries `convocationId`) | `manual` (carries `reason`). Every switch on it has an exhaustive `never` check, as in `GetConvocationDetailsUseCase`.
- In the database: **one nullable FK per source type** (`convocation_id` for now) plus a CHECK constraint for consistency. Not a polymorphic `source_type` + `source_id` pair.
- There is **no `ON DELETE CASCADE`** from convocations to entries. What happens when a convocation is deleted is OPEN-LG-04.
- A history entry whose source is a convocation navigates to the convocation detail. Mapping a source to a route is a presentation concern (ViewModel).

**PO-LG-06 — Mode.**
- Two modes are supported and switchable without changing any data:
  - **cumulative**: sum of all entries;
  - **per-season**: sum of the entries whose `earned_on` falls in the season.
- The mode is a **per-season setting**, not a global flag.

**PO-LG-07 — Tiers.**
- Thresholds (min seasons, min points, reward label, discount) are defined **per season**.
- A tier requires **both** min seasons **and** min points.
- "Seasons" means membership seniority: the number of seasons with a membership. It is independent of points, in both modes.
- Eligibility is computed, **never stored**.
- A reward handed over is stored as a fact: who received it, tier, season, snapshot of the reward label, granted by, granted at, optional note.
- Cotisation discounts create a coupling with the Cotisations module. This spec documents the coupling and specifies **no cotisation behaviour**.

**PO-LG-08 — Manual awards.**
- A Dirigeant habilité can award points **only by choosing a manual rule from the référentiel**. There are no free-text or arbitrary points, and no "propose to add to the référentiel" workflow.
- The escape hatch is `exceptional_commitment`: variable points within its maximum, reason mandatory.
- Manual awards and corrections are sensitive business actions. Their audit entry is emitted **from the use case**, not from a trigger and not from a component (ARCHITECTURE.md §11, CDC §11.3).
- Proposed codes: `legacy.points_awarded`, `legacy.points_corrected`, `legacy.reward_granted`, `legacy.rule_changed`. `audit_log` exists, but the collision with `legacy_points.corrected` and the emitter guard are covered in §0 (c).

**PO-LG-09 — RBAC.** Six new actions, added to `rbac-matrix.ts` by a later pass. See §5.

**PO-LG-10 — Screens (functional only).** See §6. Rankings are out of scope.

### Developer decisions after the first draft (PO-LG-11…16)

Made by the developer after reading the schema findings. Final for this iteration.

- **PO-LG-11 — Team type.** The team type of an entry is the one **associated to the entry itself**: for an attendance entry, convocation → team → section → `sections.type`. No new per-team attribute is created. This closes the main part of OPEN-LG-01. A manual entry has no team of its own: which type applies to it is the remaining sub-question of OPEN-LG-01.
- **PO-LG-12 — Match type column (superseded by PO-LG-23).** First draft: no match-type column, automatic match awards deferred. The developer later allowed adding the column in this feature (PO-LG-23).
- **PO-LG-13 — Audit.** The guard of `record_audit_log_entry` is widened to allow the `authorized-officer` role (Dirigeant habilité) for the Legacy codes. Trésorier is also needed for `legacy.reward_granted` (PO-LG-09). The collision with the existing `legacy_points.corrected` code remains a Mentor decision.
- **PO-LG-14 — Seniority.** Only memberships with status `active` count, one per distinct season. Other statuses do not count. Archived rows and future-season memberships are not decided and stay in OPEN-LG-08, together with the pre-go-live seasons problem.
- **PO-LG-15 — Menu entry.** A **dedicated "ASC Legacy" card is added to the Menu for every player**, for now players only (no other role sees it yet). This replaces the "no new card" line of PO-LG-10. `specs/menu.md` AC-MN-05 must be amended for this card only, by a later pass, still after Bureau validation of the grid.
- **PO-LG-16 — Rewards, corrections, configuration.**
  - A reward is granted **once per (user, tier, season)**. This closes OPEN-LG-09, except for correcting a grant recorded by mistake.
  - **No constraint on corrections**: no cap, no floor on the net value, no required `earned_on`. A reason stays mandatory (§4.10). This closes OPEN-LG-10.
  - A season must be **fully configured** (points mode **and** tiers) for Legacy to count points. For a season that is not fully configured, no points are awarded for facts dated in it, and the player screen shows that Legacy is not configured for the season. This closes OPEN-LG-11. To confirm with the developer: once the season is configured, reconciliation catches up on its already-closed convocations, like the go-live backfill (PO-LG-04).

- **PO-LG-24 — Grid validated.** The Bureau validated the barème and the tiers (as stated by the developer). `match_attendance_friendly` is **2 points** (closes OPEN-LG-02). `season_end_bonus` has no rule to load until OPEN-LG-03 is decided.

- **PO-LG-26 — Season-end bonus and match type backfill.**
  - **Season-end bonus (closes OPEN-LG-03):** an **automatic** +50 added at the season's **end date** (`earned_on` = season end date). Confirmed: it goes only to **players** with an `active` membership in that season, it has **no team type** (null, like manual rules), and it runs once per user and season (idempotent, like PO-LG-03). It needs a scheduled job in Supabase and a `season_end_bonus` rule valid at that date; with no rule, no bonus.
  - **Match type (closes OPEN-LG-12):** the column is added to `match_details` with the values friendly and official, and **every existing match is set to official**, without deleting any data. A new match with no type must still never be read as official (§4.1).
- **PO-LG-25 — Seniority and mistaken grants.**
  - **Seniority (closes OPEN-LG-08, except the points marked to confirm):** seasons from go-live onwards count automatically, as `active` memberships (PO-LG-14). Seasons before go-live (the archived ones) are **added manually**, so a long-standing member can still reach Émeraude, Rubis or Platine. Confirmed: old seasons to count are **entered as memberships** through the existing admin means (no new feature specified here). **Archived rows do not count.**
  - **Mistaken reward grant (closes OPEN-LG-09):** corrected from the admin dashboard, when that is implemented. Out of scope for this feature.

### Developer decisions on the blocking points (PO-LG-23)

- **PO-LG-23 — Blocking points closed by the developer.**
  - **OPEN-LG-01:** a manual rule and a manual entry have **no team type (null)**. Manual rules are therefore not limited to the member's sections: every manual rule valid at the date is offered. Resolution of rules by team type applies to automatic awards only.
  - **OPEN-LG-04:** when a convocation is deleted, its ledger entries are **kept and `convocation_id` is set to null** (no cascade, no compensating entry). The entry then reads as having no navigable source.
  - **OPEN-LG-07:** attendance of a **closed convocation can no longer be edited**, by a coach or by an Administrateur. A convocation closes only when **all attendance is set and 3 days have passed**. Awards are then computed once, at closure, so a later edit can no longer bypass them. Impacts to carry out in the implementation pass, not in this spec: this **changes the existing closure rules** (today 6 h after the start, trigger plus 15-min sweep, post-closure edits explicitly allowed for coach and admin) and the criteria of the convocation specs that describe them. Assumed: "3 days" counts from the convocation's date, and a convocation with incomplete attendance stays open. To confirm.
  - **OPEN-LG-12:** the match-type column **may be added** (friendly vs official), so automatic match awards are no longer deferred. Its allowed values and the value for the existing `match_details` rows (the reason it was left out, see §0 b) are a Mentor decision. A missing value must never be read as official (§4.1).
  - **Audit:** corrections use the **existing** code `legacy_points.corrected`; the proposed `legacy.points_corrected` is dropped. The naming of the other proposed codes (`legacy.points_awarded`, `legacy.reward_granted`, `legacy.rule_changed`) is left to the Mentor, given the existing style.
  - **RBAC:** `legacy:award` = Dirigeant habilité and Administrateur (as in PO-LG-09, unchanged).

### Developer decisions after the design review (PO-LG-17…21)

- **PO-LG-17 — Entry points by active role (closes B-1, B-2).** The Menu already shows cards depending on the active role (e.g. Finances for the Trésorier), so a role-dependent card is not new: ASC Legacy cards follow that same mechanism. Cards are **constants for now** (static entries in the Menu configuration, not driven by data):
  - player: "ASC Legacy" (PO-LG-15);
  - Dirigeant habilité: a card leading to the player picker (design 3.1);
  - Trésorier: a card leading to "Récompenses à remettre" (design 3.4).
  Interpretation to confirm: "constant" is read as static, hard-coded Menu cards. The `menu.md` amendments still cover AC-MN-05 and whichever of AC-MN-01 / AC-MN-17 conflict with a role-dependent card.
- **PO-LG-18 — Corrections (closes D-11).** Only the **Dirigeant habilité** creates a correction. The Administrateur does not. Consequence to carry to the RBAC pass, not decided here: `legacy:award` (PO-LG-09) also allows the Administrateur, so a correction cannot reuse it unchanged.
- **PO-LG-19 — Reason (closes D-7).** A reason is **mandatory on every manual award and every correction**, matching the `{kind:'manual', reason}` source of PO-LG-05. It therefore also applies to the five fixed manual rules (`equipment_setup`, `club_mission`, `referral`, `solidarity_action`, `partner_contribution`), not only `exceptional_commitment`.
- **PO-LG-20 — Rewards across seasons (closes D-3).** Some rewards come from loyalty over several seasons, so the player's "Récompenses obtenues" lists **every grant the player has received, all seasons**, each with its season. The list is not limited to the current season.
- **PO-LG-21 — Two extra pages for the player.**
  - **"Voir plus"** opens a dedicated **history page** where the player filters the entries (closes D-2 for the filters and the length).
  - **"Comment gagner des points"** opens a dedicated page, in French, explaining how to earn points from the **référentiel of points** (readable by every authenticated user, §5).
  Both are readable with `legacy:read_own`. The filter chips on the main screen are replaced by the filters of the history page.
- **PO-LG-22 — Corrections, Menu copy, page sizes (closes D-15, D-16).**
  - In the history filters, a correction appears under the category of the entry it corrects (closes D-14).
  - A correction may itself be corrected (the "Corriger" button also shows on correction rows).
  - The default date of the fact of a correction is **today**, so it counts in the current season.
  - The Menu cards are static, hard-coded entries (PO-LG-17 interpretation confirmed), and the proposed subtitles of the two new cards are accepted.
  - The number of recent entries on the main screen (5) and the history page size (20) are **adjustable**: each is one named constant in one place, never a literal repeated in the code. Read as a code constant, not an Administrateur setting. To confirm if a runtime setting was meant.

---

## 3. Data model (fields and meaning — no SQL)

Table names are indicative. The schema is the Mentor agent's decision.

### 3.1 Rule (référentiel) — one row per version of (action, team type)

| Field | Meaning |
|---|---|
| id | Identity of this version |
| action code | One of the codes in §1 (closed vocabulary) |
| team type | Discipline the rule applies to: the type associated to the entry, i.e. `sections.type` (PO-LG-11; manual entries: OPEN-LG-01) |
| award channel | `automatic`, `manual`, or both (`event_participation`, which is automatic for meetings and manual otherwise) |
| points kind | `fixed` or `variable` |
| points | Fixed value (fixed rule) |
| max points | Upper bound (variable rule). The minimum is 0 |
| reason required | True for `exceptional_commitment` |
| valid_from / valid_to | Validity period. `valid_to` is empty while the version is current. Changing points means closing this period and creating a new version. Points are never edited in place on a version that has been used |

Two consequences of "no fallback, no precedence" (PO-LG-02):
- Validity periods for the same (action, team type) **must not overlap**. Otherwise resolution would not be deterministic.
- The boundary convention (whether `valid_to` is inclusive) is left to the Mentor agent. It must be identical in TypeScript and SQL.

### 3.2 Ledger entry — append-only

| Field | Meaning |
|---|---|
| id | — |
| user | The member credited or debited |
| points | **Snapshot**, a signed integer. Never recomputed from the rule |
| rule | The rule version that produced it. Empty for a pure correction (see below) |
| earned_on | Date of the fact. For automatic entries it is the convocation date, using the same club-local date convention as existing code (`Europe/Paris`, which is itself still open as PO-PU-09). It drives season attribution |
| created_at | When the row was written |
| source | `convocation` (FK `convocation_id`) or `manual` (reason). Exactly one, enforced by a CHECK |
| corrects | Optional reference to the entry being compensated |
| created_by | The actor for manual entries and corrections. Empty or system for automatic entries |

A correction is a manual-source entry with `corrects` set and a mandatory reason. Its season is taken from its own `earned_on`. It need not equal the corrected entry's `earned_on` (PO-LG-16).

### 3.3 Season Legacy settings — one per season

| Field | Meaning |
|---|---|
| season | — |
| points mode | `cumulative` or `per_season` (PO-LG-06) |

### 3.4 Tier — one row per (season, tier)

| Field | Meaning |
|---|---|
| season | — |
| rank / name | Bronze=1 … Platine=6 (the mockup badges are numbered) |
| min seasons, min points | Both required (PO-LG-07) |
| reward label | Displayed and snapshotted when the reward is granted |
| discount | Informational only. It is applied by the Cotisations module, not here |

### 3.5 Reward grant — a fact

Recipient, tier, season, reward label snapshot, granted by, granted at, optional note. One grant per (recipient, tier, season). No update or delete path is specified (correcting a mistaken grant: OPEN-LG-09).

### 3.6 Derived and never stored

Balance, seniority, current tier, next tier, missing points and seasons, and "reward to hand over".

---

## 4. Business rules — `domain/policies/` (pure functions)

All of these are pure and testable in Node without mocks (CLAUDE.md §8). Those marked **[SQL mirror]** are duplicated by hand in Postgres. Both sides name each other in a comment, following the `convocation-closure.ts` header pattern ("SQL is authoritative in production; this function exists so the rule is readable and testable").

### 4.1 `actionForConvocation` [SQL mirror]
- **In:** convocation type (`training|match|meeting`), match type (matches only).
- **Out:** action code.
  - training → `training_attendance`
  - match + official → `match_attendance_official`
  - match + friendly → `match_attendance_friendly`
  - meeting → `event_participation`
- Exhaustive `never` check on the convocation type.
- **Tests:** one per branch. A match with an unknown or missing match type returns no action rather than defaulting to official. A missing match type must never be read as official, for the same reason as AC-MS-07, and it is blocked today by OPEN-LG-12.

### 4.2 `resolveRule` [SQL mirror]
- **In:** rules, action code, team type, `earned_on`.
- **Out:** the single matching rule version, or none.
- **Tests:**
  - exact match;
  - same action, other team type only → none;
  - `earned_on` before `valid_from` → none;
  - `earned_on` after a closed `valid_to` → none;
  - two consecutive versions → the version valid at `earned_on` is returned, **not** the latest one;
  - both boundary days, according to the convention chosen in §3.1.

### 4.3 `expectedConvocationAwards` [SQL mirror]
- **In:** convocation (type, match type, team type, date), its attendance records, rules.
- **Out:** points per user.
- Only users with `actualStatus = 'present'` count. The function never reads `ConvocationResponse`.
- **Tests:**
  - present → rule points;
  - absent (excused or unexcused) → 0;
  - a player who responded "present" but was recorded "absent" → 0;
  - no matching rule → 0 for every user, with an "unresolved" signal so the Administrateur can see it (PO-LG-02);
  - a retroactive convocation uses the rule valid at its date (PO-LG-04).

### 4.4 `reconcileConvocationAwards` [SQL mirror] — the core of PO-LG-03
- **In:** expected points per user, and the entries already linked to this convocation (convocation source, including earlier automatic deltas).
- **Out:** a list of deltas to insert, `expected − already awarded`, with no zero rows.
- Manual corrections (manual source) are **not** counted in "already awarded". As a result, re-running reconciliation never undoes a correction made by an officer or admin.
- **Tests:**
  - first closure → one entry per present user;
  - running twice with no change → no deltas (**idempotent**);
  - after a present user is switched to absent and the convocation re-closed → one negative compensating entry;
  - the reverse change → a positive delta;
  - a manual correction of an automatic entry followed by re-close → no delta (correction preserved);
  - the backfill over N closed convocations equals running closure N times.

### 4.5 `computeBalance`
- **In:** entries, mode, season (date range).
- **Out:** an integer.
  - cumulative → sum of all entries;
  - per-season → sum of entries whose `earned_on` falls in the season range.
- **Tests:**
  - both modes on the same data give different totals without any data change;
  - an entry whose `earned_on` falls in a gap between seasons counts in cumulative mode only;
  - a correction created in season N+1 for a fact in season N counts in season N if its `earned_on` is in N;
  - a rule change after awarding leaves the balance unchanged (snapshot).

### 4.6 `computeSeniority`
- **In:** a user's memberships.
- **Out:** the number of distinct seasons.
- Only `active` memberships count (PO-LG-14). Archived and future-season rows: OPEN-LG-08.
- **Tests:** duplicate rows for the same season count once. `pending` and `suspended` rows count for nothing. The archived and future cases depend on OPEN-LG-08.

### 4.7 `computeTierStatus`
- **In:** the season's tiers, points (according to the season's mode), seniority.
- **Out:** current tier (the highest one with **both** thresholds met, or none), next tier, missing points, missing seasons, and whether the maximum is reached.
- **Tests:**
  - 320 pts / 2 seasons → Bronze, next Argent, 80 pts missing (mockup state 1);
  - 450 pts / 1 season → Bronze, Argent points met but 1 season missing (mockup state 2: **points alone never unlock a tier**);
  - 0 / 1 → no tier, next Bronze;
  - 2840 / 11 → Platine, max reached;
  - a season that is not fully configured → no tier status, "not configured" (PO-LG-16).

### 4.8 `rewardsStatus`
- **In:** tiers reached, existing grants.
- **Out:** for each tier reached, "handed over on date X" or "to hand over".
- The uniqueness key is (user, tier, season) (PO-LG-16).
- **Tests:** a tier reached with no grant → to hand over. A tier reached with a grant → handed over. A grant for the same tier in another season does not count as handed over.

### 4.9 `validateManualAward`
- **In:** chosen rule, points, reason, `earned_on`.
- **Out:** ok, or a domain error.
- **Tests:**
  - the rule is not manual-channel (e.g. `training_attendance`) → rejected;
  - the rule is not valid at `earned_on` → rejected;
  - fixed rule with points different from the rule's → rejected (an officer cannot override them);
  - variable rule with points < 0 or > max → rejected;
  - any manual rule with an empty reason → rejected (PO-LG-19);
  - a valid fixed award → ok.
- There is no input path that creates points without a rule (PO-LG-08).

### 4.10 `validateCorrection`
- **In:** the target entry, points, reason, user.
- **Out:** ok or error.
- **Tests:** an empty reason → rejected. A target entry belonging to another user → rejected. Zero points → rejected. No upper or lower bound otherwise (PO-LG-16).

---

## 5. RBAC

New actions, each with its RLS mirror. Nothing is added to `rbac-matrix.ts` in this pass. Per the header of `rbac-matrix.ts`, an action gets a matrix entry only if `presentation/` needs to decide something before the query runs. For `legacy:read_own`, which every authenticated user holds, the later pass may decide it is RLS-only.

| Action | Roles | Scope | RLS mirror (table / policy intent, no SQL) |
|---|---|---|---|
| `legacy:read_own` | every authenticated user | own rows | ledger: select where user = `auth.uid()`; reward grants: same; season settings, tiers, rules: select for every authenticated user (reference data, like `sections`/`seasons` — needed to render labels, thresholds, progress) |
| `legacy:read_any` | Dirigeant habilité, Administrateur | club-wide | ledger and reward grants: select for `has_role('authorized-officer') or is_admin()` |
| `legacy:award` | Dirigeant habilité, Administrateur | club-wide | ledger: insert of **manual-source rows only** (`convocation_id` null, reason present, rule is manual-channel and valid) for those roles. Convocation-source rows are written only by the SECURITY DEFINER closure path, never by a client. **No update or delete policy, and privileges revoked** (append-only, PO-LG-01). Corrections go through this same action (no other write action exists in PO-LG-09) |
| `legacy:grant_reward` | Dirigeant habilité, Trésorier, Administrateur | club-wide | reward grants: insert for those three roles. No update or delete |
| `legacy:manage_rules` | Administrateur | club-wide | rules: insert, plus update restricted to closing `valid_to` (column-level grant, the same technique as `match_details`) |
| `legacy:manage_tiers` | Administrateur | club-wide | tiers and season settings (points mode): insert and update. The season mode is mapped here because it is per-season Legacy configuration, like tiers |

**Does the Trésorier need `legacy:read_any`?** **Yes, functionally.** A Trésorier who holds `legacy:grant_reward` but no read access cannot see which members have a reward to hand over. The cotisation discount coupling (PO-LG-07) points the same way. PO-LG-09 as written does not give it to them. The shape of the fix is for the later RBAC pass:
- (a) add `treasurer` to `legacy:read_any`, or
- (b) give a narrower projection (tier status and grants, without the entry history).

This is not a spec blocker.

Not involved: Coach/Staff, Responsable de section, Référent médical and Bénévole hold only `legacy:read_own`. The CDC matrix has no Legacy row. This table comes entirely from PO-LG-09.

**Audit (PO-LG-08):**

| Code | Emitted by |
|---|---|
| `legacy.points_awarded` | manual award use case |
| `legacy.points_corrected` | correction use case |
| `legacy.reward_granted` | reward grant use case |
| `legacy.rule_changed` | rule create/close use case |

All of them go through `record_audit_log_entry`, whose guard must be widened to cover authorized-officer and treasurer (§0 c).

**Automatic awards and reconciliation deltas are not audited.** They are system-derived. The ledger row and its `convocation_id` are the trace. The sensitive act behind a negative automatic delta is the attendance correction itself, which is already audited as `attendance.updated` when an admin makes it.

---

## 6. Screens (functional only)

**Entry point.** A dedicated "ASC Legacy" card in the Menu grid, shown to every player and to nobody else for now (PO-LG-15). The card does not exist in the repo's Menu mockup or code, and AC-MN-05 forbids it (§0 e.5). Building it means amending `specs/menu.md` AC-MN-05 for the Legacy card only, once the Bureau validates the grid. The designer agent must add the card to the Menu design. The other Legacy exclusions (AC-PD-12 dashboard, AC-PR-12 profile) are unchanged.

### 6.1 Player Legacy screen (every authenticated user — own data)
- **Balance**, computed according to the current season's mode. The caption says "cumul depuis votre arrivée" or "saison X".
- **Current tier**, plus **progress to the next tier** in both points and seasons. When the points are met but the seasons are not, this is stated explicitly (mockup state 2).
- **Next rewards**, and the tiers reached, each marked "**remise le …**" or "**à remettre**".
- **Chronological history**, grouped by month: label, signed points, date of the fact, and navigation to the source convocation when there is one. A compensating entry reads as a correction and shows what it corrects. A manual entry shows its reason (the mockup shows the `exceptional_commitment` reason to the player).
- **States:** loading, empty (new member), max tier reached.

**Mockup elements not covered by PO-LG-10.** Decided by PO-LG-21 unless stated:
- the history filter chips "Tout / Entraînements / Matchs / Autres": filtering moves to the dedicated history page;
- "Voir plus": opens that dedicated history page;
- "Comment gagner des points": opens a dedicated French page built from the référentiel of points (read already allowed by §5);
- the friendly-match value "+3" shown in the mockup is illustrative only. The value is 2 (PO-LG-24).

### 6.2 Dirigeant habilité (mobile)
- Create a correction of an entry, with a mandatory reason (PO-LG-18). Only this role does.
- Award points to a player by choosing from the list of **manual rules** valid at the date of the fact. Points are fixed, except `exceptional_commitment` (0–50 and reason).
- View any player's Legacy screen.
- Record a reward as handed over.
- No mockup exists for this view.

### 6.3 Trésorier (mobile)
- Record a reward as handed over. This needs the read access discussed in §5.
- No mockup exists.

### 6.4 Administrateur (web backoffice)
- Manage rules: create a version (with its points) and close its validity period.
- Manage tiers per season.
- Set each season's points mode.
- See convocations that awarded no points because no rule matched (PO-LG-02).
- No mockup exists.

---

## 7. Acceptance criteria

| ID | Given / When / Then |
|---|---|
| AC-LG-01 | **Given** two players with entries, **when** player A opens their Legacy screen or queries the ledger directly with their token, **then** only A's entries, balance, tiers and grants are returned, and B's are never returned (RLS, not only the UI) |
| AC-LG-02 | **Given** entries spread over two seasons, **when** the current season's mode is `cumulative`, **then** the balance is the sum of all entries; **when** the admin switches it to `per_season`, **then** the balance is the sum of entries whose `earned_on` is in the current season — with no ledger row added, changed or removed |
| AC-LG-03 | **Given** an entry awarded at 5 pts under rule version v1, **when** the admin closes v1 and creates v2 at 8 pts, **then** that entry still shows 5 pts and the balance is unchanged |
| AC-LG-04 | **Given** a closed convocation already reconciled, **when** reconciliation runs again with no attendance change, **then** zero entries are inserted |
| AC-LG-05 | **Given** a reconciled convocation where a present player is changed to absent and the convocation is re-closed, **when** reconciliation runs, **then** exactly one compensating entry of −(snapshot points) is inserted, and the original entry is untouched |
| AC-LG-06 | **Given** a retroactive convocation (created after its date) whose date falls under rule v1, while v2 is the version valid today, **when** it closes, **then** present players receive v1's points |
| AC-LG-07 | **Given** a Dirigeant habilité, **when** they try to award points with no rule, with a rule that is automatic-only, or with a fixed rule at a value different from the rule's, **then** the award is refused by the use case **and** by RLS |
| AC-LG-08 | **Given** `exceptional_commitment`, **when** the points are outside 0–50 or the reason is empty, **then** the award is refused; **when** the award is valid, **then** one `legacy.points_awarded` audit row is written by the use case |
| AC-LG-09 | **Given** a Trésorier and a player who has reached Bronze with no grant, **when** the Trésorier records the handover, **then** a grant row (recipient, tier, season, reward label snapshot, granted by, granted at, note) exists, the player's screen shows "Remise le …", and one `legacy.reward_granted` audit row exists |
| AC-LG-10 | **Given** 450 pts and 1 season of seniority, **when** tier status is computed, **then** the tier is Bronze, and Argent is shown as points met with 1 season missing |
| AC-LG-11 | **Given** any role, **when** it attempts an UPDATE or DELETE on a ledger entry, **then** the attempt is refused |
| AC-LG-12 | **Given** a convocation whose team type has no matching rule, **when** it closes, **then** no entry is written, and the Administrateur can see that the convocation awarded no points |
| AC-LG-13 | **Given** a player whose `ConvocationResponse` is "present" but whose `AttendanceRecord` is "absent", **when** the convocation closes, **then** no points are awarded |
| AC-LG-14 | **Given** the go-live backfill over N already-closed convocations, **when** it runs twice, **then** the second run inserts nothing |
| AC-LG-15 | **Given** an officer's correction of an automatic entry, **when** the convocation is later re-closed, **then** the correction is not undone |
| AC-LG-16 | Every reference function in §4 marked [SQL mirror] has Vitest coverage of the cases listed there, and a comment naming its SQL counterpart |

---

## 8. OPEN points

From the mentoring session (carried as-is):

| ID | Point | Decides | Trigger |
|---|---|---|---|
| ~~OPEN-LG-01~~ **CLOSED by PO-LG-23 (manual = null team type).** Was: **Team type representation.** Mostly decided by PO-LG-11 (type associated to the entry, via `sections.type`). Remaining sub-question: a manual entry has no team, so which team type applies to a manual award for a member of several sections? Is the officer's list of manual rules restricted to the member's own sections' types? | Mentor agent (schema) | Before any migration |
| ~~OPEN-LG-02~~ | **CLOSED by PO-LG-24:** friendly match = 2 points | — | — |
| ~~OPEN-LG-03~~ | **CLOSED by PO-LG-26:** automatic +50 at the season end date | — | — |
| ~~OPEN-LG-04~~ **CLOSED by PO-LG-23 (keep entries, `convocation_id` null).** Was: Behaviour when a convocation is deleted. Options, none chosen: (a) forbid deletion once points exist; (b) keep the entries and set `convocation_id` to null; (c) write compensating entries. Note: `attendance_records` cascades from `convocations`, and `convocations` cascades from `teams` | Mentor agent / developer | Before the ledger migration |
| **OPEN-LG-05** | Link with missions. `equipment_setup` and `club_mission` may later be awarded automatically from mission assignments. Manual for now | Developer | Missions feature spec |
| **OPEN-LG-06** | Other disciplines (esport, chess, domino) earn points only if rules are created for their team type. Nothing to build | Bureau | — |
| ~~CDC §8~~ | **Done (PO-LG-24):** Bureau validation of the grid | — | — |

Surfaced by schema inspection or while writing. These are not decisions; each needs an owner:

| ID | Point | Decides | Trigger |
|---|---|---|---|
| ~~OPEN-LG-07~~ **CLOSED by PO-LG-23 (closed convocations not editable; close when attendance complete and 3 days past).** Was: Attendance edited **after closure** without a reopen (coach, no time limit; admin, explicitly allowed). PO-LG-03 reconciles "at closure" only, so these edits would never be reflected. Options: re-run reconciliation on attendance writes for an already-closed convocation; a sweep; or only on reopen. Note that no reopen exists in the schema | Mentor agent / developer | Before the award trigger migration |
| ~~OPEN-LG-08~~ **CLOSED by PO-LG-25 (post-go-live automatic, earlier seasons added manually).** Was: Seniority counting. Statuses decided by PO-LG-14 (`active` only). Remaining: whether archived rows count, whether a future-season membership counts, and how to handle **seasons before go-live**. No membership rows exist for those seasons, so long-standing members cannot reach Émeraude, Rubis or Platine without a historical backfill | Developer + Bureau | Before tier eligibility is implemented |
| ~~OPEN-LG-09~~ **CLOSED by PO-LG-25 (admin dashboard, later).** Was: Mostly decided by PO-LG-16 (one grant per user, tier and season). Remaining: how to correct a grant recorded by mistake | Developer | Before the reward grant migration |
| ~~OPEN-LG-10~~ | **Closed by PO-LG-16:** no constraint on corrections | — | — |
| ~~OPEN-LG-11~~ | **Closed by PO-LG-16:** a season must be fully configured (mode and tiers) for points to count | — | — |
| ~~OPEN-LG-12~~ **CLOSED by PO-LG-26 (column added, existing matches set to official).** Was: **column may be added (PO-LG-23); values and backfill of existing rows remain a Mentor decision.** Was: Match type absent from the schema (`competition_type` never added, PO-MS STOP block, PO-CTS-01). Developer decided not to add it in this feature (PO-LG-12): automatic match awards are deferred until it exists | Developer (backfill of existing `match_details` rows) | Before automatic match awards |
| — | RESOLVED (PO-LG-23: keep `legacy_points.corrected`). Audit code collision: existing `legacy_points.corrected` vs proposed `legacy.points_corrected`. The guard widening for `authorized-officer` is decided (PO-LG-13); Trésorier for `legacy.reward_granted` is still needed | Mentor agent | Audit migration of this feature |
| — | Trésorier read access (§5): `read_any` or a narrower projection | Developer | Later RBAC pass |
| — | Menu entry: card decided (PO-LG-15); AC-MN-05 must still be amended | Developer | When the entry point is built |

---

## 9. Out of scope

- Rankings, i.e. the "classements" part of the P1 module. `specs/mobile-leaderboard.md` is a different feature.
- Applying cotisation discounts. That is a coupling only, owned by the Cotisations module.
- Automatic awards from missions (OPEN-LG-05).
- Points for goals, starting-line-up status or votes (AC-MS-20, `coach-match-composition.md`, `player-vote.md`). None of these are in the barème.
- Any SQL or migration, any TypeScript code, any change to `rbac-matrix.ts`, any change to the registry or to other specs in this pass.
- Lifting AC-PD-12 (dashboard) and AC-PR-12 (profile). No Legacy indicator appears on those screens.

---

**Handoff to designer-agent:** ready. The player screen has a mockup. The officer, treasurer and admin screens can be designed by composition. No OPEN point blocks design; the Menu card (PO-LG-15) is to be designed too. Development is no longer blocked by the grid (PO-LG-24). The first-migration blockers OPEN-LG-01, OPEN-LG-04 and OPEN-LG-07 are closed (PO-LG-23); the match-type values and backfill (OPEN-LG-12) are for the Mentor.
