---
name: commit-gitmoji
description: Use when the user asks to write, generate, or review a git commit message for the project, or after code changes are ready to be committed. Applies the Gitmoji convention  combined with a scope reflecting the Clean Architecture layer or feature module touched.
---

# Commit messages — Gitmoji convention 

## Format

```
<gitmoji> <type>(<scope>): <short description, imperative mood, lowercase>
```

- One gitmoji per commit, matching the dominant intent of the change.
- `<type>` follows Conventional Commits (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`, `ci`).
- `<scope>` is the architecture layer (`domain`, `data`, `presentation`) or the feature module (`convocations`, `cotisations`, `audit-log`, `rbac`) — whichever is more informative for that commit. Never both at once.
- Description under ~72 characters, no trailing period, imperative ("add", not "added" or "adds").
- Body (optional, blank line after the subject) only when the *why* isn't obvious from the diff — never restate the *what*, the diff already shows that.

## Atomic commits

Every commit must be **atomic**: one logical change, fully self-contained, that could be reverted on its own without breaking the build or leaving the codebase in an inconsistent state.

- One concern per commit — a feature, a fix, a refactor, or a test addition, never several at once. "Add convocation reminder + fix an unrelated typo in the mapper" is two commits, not one.
- A commit should make sense read in isolation, out of order, without needing the next commit to compile or pass tests.
- Size is not the criterion — a one-line RLS policy fix is atomic; a 400-line change is still atomic if it's genuinely one indivisible concern (e.g. a single use case touching its interface, implementation, and mapper together). Don't split a change that only works as a whole just to make commits look smaller.
- If a diff mixes concerns, the fix is to split the commit (`git add -p` or separate `git add` per file/hunk), not to write a longer message that tries to describe everything at once.

## Reference — curated gitmoji subset for this project (https://gitmoji.dev)

Full list at gitmoji.dev; this project uses a deliberately small, consistent subset rather than the entire catalog:

| Gitmoji | Code | Meaning |
|---|---|---|
| ✨ | `:sparkles:` | New feature |
| 🐛 | `:bug:` | Bug fix |
| 🚑️ | `:ambulance:` | Critical hotfix |
| ♻️ | `:recycle:` | Refactor without behavior change |
| ✅ | `:white_check_mark:` | Add or update tests |
| 🔒️ | `:lock:` | Security fix, RLS policy, permission logic |
| 📝 | `:memo:` | Documentation (markdown, comments) |
| 🎨 | `:art:` | Improve code structure/format, no logic change |
| ⚡️ | `:zap:` | Performance improvement |
| 🔥 | `:fire:` | Remove code or files |
| 🗃️ | `:card_file_box:` | Database schema, migration, RLS policy definition |
| 👷 | `:construction_worker:` | CI/CD, build config |
| 🔖 | `:bookmark:` | Release / version tag |
| 🚧 | `:construction:` | Work in progress, not finished |
| ⬆️ | `:arrow_up:` | Upgrade a dependency |

## Examples (aligned with project modules)

```
✨ feat(convocations): add optimistic cache update on response debounce
🐛 fix(data): correct upsert conflict target in user_responses repository
🔒️ fix(rbac): restrict aptitude field from full health record for coach role
🗃️ feat(audit-log): add trigger for consultation of health data
♻️ refactor(domain): extract SendConvocationUseCase from calendar module
✅ test(presentation): cover useConvocationsViewModel debounce behavior
📝 docs: update RETENTION-PURGE.md with confirmed health data retention window
🚑️ fix(auth): patch MFA bypass on admin login flow
```

## Instructions for Claude

1. Read the actual diff before proposing a message — never infer intent from the branch name alone.
2. Before proposing a message, check the diff is atomic per the rule above. If it mixes concerns, say so explicitly and propose how to split it (which files/hunks go in which commit) — do not paper over a mixed diff with a longer message or a second gitmoji.
3. Prefer `domain`/`data`/`presentation` as scope when the change is architecturally focused (e.g. a single use case or repository); prefer the feature/module name when the change spans layers but stays within one feature.
4. Flag it explicitly if a change touches sensitive areas (health data, RBAC permissions, audit log) even when the gitmoji already signals it — a one-line note in the body is enough, not a restatement of the diff.
5. Never invent a scope that doesn't match an existing module or layer in `ARCHITECTURE.md`.
6. Never include Claude co-author footers (e.g. `Co-Authored-By: Claude ...`) in commit messages — commits must not reference Claude or any AI assistant.