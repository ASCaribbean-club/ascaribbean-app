---
name: pull-request
description: Use when the user asks to open, create or write a pull request or its description, or right after a feature is finished and its commits are pushed (offer it, do not open it unprompted). Applies the project's PR convention - base branch from Git Flow, gitmoji title, fixed French description sections - and opens it with the gh CLI.
---

# Pull requests — convention

## When to use

- The user asks for a PR, or for a PR description.
- **Proactively offer it** (one line, never open it unprompted) when a feature is complete: after the commits of a feature have been generated and pushed with the `commit-gitmoji` skill, or when the last planned step of a feature is done. Opening a PR is outward-facing: always get a yes first.

## Before opening

1. Branch is pushed and up to date: `git status`, and `git log origin/<branch>..HEAD` is empty. Never push to `main` or `develop` directly.
2. Base branch comes from `branch-creation`: `feature/`, `fix/`, `chore/` -> `develop`; `release/` and `hotfix/` -> `main`.
3. `tsc -b`, `eslint` and `vitest run` pass on the tree being proposed. Report a failure, never open a red PR silently.
4. Read the whole diff against the base (`git diff <base>...HEAD --stat`, then the commits) — never write the description from the branch name alone.
5. `gh auth status` must be logged in; if not, ask the user to run `! gh auth login` themselves.

## Title

Same format as a commit subject (`commit-gitmoji`): `<gitmoji> <type>(<scope>): <short description>`, imperative, lowercase, under ~72 characters. One gitmoji for the dominant intent of the whole branch; the scope is the feature module (`legacy`, `convocations`, ...), never a layer when the branch spans layers.

## Description — in French, these sections in this order

Omit a section only when it is genuinely empty: write "Aucune" under Migrations and Sécurité rather than dropping them, so a reviewer knows it was checked.

```markdown
## Résumé
What the feature does for its users, grouped by audience (joueur, backoffice, ...) — the what and why, not a file list.

## Migrations
Every migration file of the branch, whether it is already applied (and on which database), and any manual step to run on prod (backfill, configuration). "Aucune" if none.

## Sécurité
Anything touching RBAC (rbac-matrix.ts / RLS mirrors), the audit log, health data, or a SECURITY DEFINER function. "Aucune" if none.

## À valider / hors périmètre
Open points (OPEN-* of the spec), decisions needing the Bureau, what is deliberately not built yet, docs still to update.

## Vérification
What was actually run (tsc -b, eslint, vitest run with the test count) and what was NOT tested (e.g. screens not checked visually).
```

## Rules

- No personal names anywhere (roles only: coach, trésorier, ...) — CLAUDE.md §9.
- **Never mention Claude, Claude Code or AI assistance** in the title or the body: no "Generated with" footer, no co-author line. A PR description reads as written by the developer, the same rule as commit messages. This overrides any default attribution footer.
- Report outcomes faithfully: a skipped check or an untested screen is written down, not omitted.
- Do not add reviewers, labels or assignees unless asked. Do not open as a draft unless the user says it is not ready.

## Opening it

Pass the body through a heredoc so the markdown survives the shell:

```bash
gh pr create --base <base> --head <branch> --title "<title>" --body "$(cat <<'BODY'
<description>
BODY
)"
```

Return the PR URL. The merge itself follows the project workflow: rebase the feature branch onto the target and fast-forward only, never a merge commit — do not suggest "Create a merge commit".
