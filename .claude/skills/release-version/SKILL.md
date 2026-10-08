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

- Before finishing, list the migrations in `supabase/migrations/` that shipped since the last release (same commit range as step 1) and check which ones aren't yet applied on the **production** project (`mcp__supabase__list_migrations`).
- If any are pending, **always ask** the user whether to apply them to prod — never apply silently, and never skip the question or leave them unapplied without mentioning it. If none are pending, say so in one line.
- After applying via MCP, rename the local migration file to match the remote-recorded timestamp.

## 6. Verify and commit

- Run `npx tsc -b` and `npx vitest run` (the changelog parser is tested).
- Commit with the `commit-gitmoji` skill: `📝 docs(changelog): add x.y.z entries and bump version to x.y.z`, one commit for the three files.
- Never mention Claude or AI in the message. Don't push or tag unless asked.
