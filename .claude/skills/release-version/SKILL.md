---
name: release-version
description: Use when the user asks to bump the app version, update the changelog, cut a release, or prepare release notes. Updates package.json, package-lock.json and CHANGELOG.md consistently, in the format the in-app changelog parser expects.
---

# Release — version bump and changelog

## 1. Find what changed

- Last release commit: `git log --format='%h %s' -- CHANGELOG.md | head -1`.
- Commits since: `git log --format='%h %s' <that-hash>..HEAD`.
- Keep only what a user can see or feel. Skip tests, refactors, docs, specs, CI and pure schema work with no visible effect.

## 2. Pick the version (semver, `0.x` phase)

- New user-facing feature or screen → minor (`0.9.0` → `0.10.0`).
- Only fixes or cosmetic changes → patch (`0.9.0` → `0.9.1`).
- Never go to `1.0.0` unless the user says so.
- If the choice isn't obvious, recommend one and say why — don't ask an open question.

## 3. Update the three files

- `package.json` — `version`.
- `package-lock.json` — `version` at line 3 and in `packages[""]` (line ~9). No `npm install` needed.
- `CHANGELOG.md` — insert the new section **above** the previous one, never edit older entries.

## 4. CHANGELOG format (French, parsed by `parseMobileChangelog`)

```
## [x.y.z] — YYYY-MM-DD

### Web
**Administrateur**
- ...

### Mobile
**Trésorier**
- ...

**Tous**
- ...
```

- Headings are exact: `## [x.y.z] — date` (em dash), `### Web` / `### Mobile`, optional `**Role**` line, then `- item`.
- `### Web` is the admin console and is hidden in the app; `### Mobile` is shown in the in-app dialog. Omit a platform with no entries.
- Roles: Joueur, Coach, Responsable de section, Dirigeant habilité, Trésorier, Référent médical, Bénévole, Administrateur, or `Tous`.
- One short sentence per item, written for club members, in French. No commit hashes, file names or jargon. Prefix a bug fix with « Correction : ».
- Never use a personal name — roles only.

## 5. Production migrations — always ask

The Supabase MCP only reaches **dev** (`GOUVERNANCE.md`); prod is reached through the CLI, which may be linked to prod (check `supabase/.temp/linked-project.json`). **Dev timestamps are the source of truth: never rename a local migration file to fit prod — align prod's history to the files instead.**

- Run `supabase migration list --linked` and look for rows missing on the remote side (pending) or present only on one side with a different timestamp for the same migration name.
- If any are pending, **always ask** the user whether to apply them to prod — never apply silently, and never leave them unapplied without mentioning it. If none are pending, say so in one line.
- If prod recorded a migration under another timestamp (remote-only row + local-only row, same name), ask, then fix prod's history first: `supabase migration repair --linked --status reverted <prod-ts>` and `--status applied <local-ts>`. This edits the history table only.
- Dry-run first (`supabase db push --linked --dry-run`) and check the list matches expectations, skim the SQL for destructive statements, then let the user run `! supabase db push --linked --yes` (the permission classifier blocks a blind prod push).
- Re-run `supabase migration list --linked` afterwards: every row must show the same timestamp on both sides. Switch the link back to dev if it was changed.

## 6. Verify and commit

- Run `npx tsc -b` and `npx vitest run` (the changelog parser is tested).
- Commit with the `commit-gitmoji` skill: `📝 docs(changelog): add x.y.z entries and bump version to x.y.z`, one commit for the three files.
- Never mention Claude or AI in the message. Don't push or tag unless asked.
