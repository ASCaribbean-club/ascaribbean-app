---
name: create-release
description: Use when the user asks to create a version, cut a release, or ship develop to main ("crée une version", "fais une release"). Checks for pending PRs on develop, asks the developer for the bump type (major, minor or patch), commits the version bump on a release branch and opens a PR into develop, pauses until the developer confirms it is merged, then opens the develop -> main pull request. Orchestrates the release-version, commit-gitmoji, branch-creation and pull-request skills.
---

# Create a release — two PRs, with a pause between them

Orchestration only: the bump, changelog format and prod-migration check live in `release-version`; commit format in `commit-gitmoji`; branch naming in `branch-creation`; PR format in `pull-request`. Read them, don't duplicate them. Never push to `develop` or `main` directly. Pushing and opening a PR are outward-facing: get a yes first.

```
develop ──▶ release/x.y.z ──PR #1──▶ develop ──PR #2──▶ main
                                  (pause: wait for merge)
```

## 1. Check pending PRs on develop

- `gh auth status` must be logged in; if not, ask the user to run `! gh auth login`.
- `gh pr list --base develop --state open --json number,title,author,isDraft,headRefName,reviewDecision`.
- If any exist, list them (number, title, draft or not) and **ask** whether to wait or release without them. Never merge them yourself.
- `git fetch origin`; local `develop` must be clean and equal to `origin/develop`. Otherwise stop and report.

## 2. Ask the bump type

AskUserQuestion with **patch** (fixes/cosmetic), **minor** (new user-facing feature or screen), **major** (breaking change / `1.0.0`). Show the current version from `package.json` and the resulting number for each. Recommended option first (`release-version` §2; in the `0.x` phase major only if the user explicitly wants it), with a one-line reason based on commits since the last release.

## 3. Release branch, bump and changelog

- `git switch -c release/x.y.z develop` (`branch-creation`).
- Follow `release-version` §1, §3, §4 with the chosen version: `package.json`, `package-lock.json`, `CHANGELOG.md`. Then §5 (production migrations — always ask, never apply silently).

## 4. Verify, commit, PR #1 (release/x.y.z -> develop)

- `npx tsc -b` and `npx vitest run` must pass. Report any failure and stop.
- One commit via `commit-gitmoji`: `📝 docs(changelog): add x.y.z entries and bump version to x.y.z`.
- Ask, then push the branch and open the PR with `pull-request` conventions but base `develop`. Title: `🔖 chore(release): x.y.z`; Résumé = the new CHANGELOG entries.
- Return the PR URL.

## 5. Pause — hand control to the developer

Stop here. Tell the user PR #1 is waiting for review/merge and ask them to say when it is merged. Do nothing else until they answer; do not poll or merge it.

## 6. Resume after merge: PR #2 (develop -> main)

- `git fetch origin`; confirm the bump commit is on `origin/develop` (`git log origin/develop --oneline -5`) and `gh pr view <PR #1> --json state` is `MERGED`. If not, say so and ask again.
- `git switch develop && git pull --ff-only`. Optionally offer to delete the local release branch.
- Re-check `gh pr list --base develop --state open`; if new PRs appeared, mention them and ask.
- Open the PR with base `main`, head `develop`, title `🔖 chore(release): x.y.z`, French description with the fixed `pull-request` sections (Résumé = CHANGELOG entries, Migrations = prod state from §3). Ask before opening.
- Return the URL. Do not tag or merge it; the merge follows the project workflow (rebase, ff-only, no merge commit).

## Rules

- No Claude / AI mention and no co-author or "Generated with" line in commits or PR bodies (CLAUDE.md §9, `pull-request`).
- No personal names — roles only.
