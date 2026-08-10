---
name: branch-creation
description: Use when the user asks to create a git branch, start a new feature, a fix, or a release, or asks about the branch naming convention for the project. Covers the feature/, fix/, hotfix/, release/ prefixes and which parent branch to use.
---

# Branch creation — Git Flow convention

## Principle

The project follows a lightweight version of **Git Flow**, adapted to a club with a single active maintainer most of the time (see `GOUVERNANCE.md`):

- `main`: production code (deployed on Netlify), always stable.
- `develop`: integration branch, base for all new branches except `hotfix/*`.
- Every other branch is **temporary**: created from its parent, merged, then deleted. No feature branch should outlive a single iteration.

## Branch types and origin

| Prefix | Created from | Merged into | Use |
|---|---|---|---|
| `feature/` | `develop` | `develop` | New module or feature (e.g. a P0/P1 module from the CDC) |
| `fix/` | `develop` | `develop` | Non-blocking bug fix in production |
| `hotfix/` | `main` | `main` **and** `develop` | Urgent fix already live in production (security, blocking regression) |
| `release/` | `develop` | `main` **and** `develop` | Stabilization before shipping a batch of features |
| `chore/` | `develop` | `develop` | Technical task with no functional impact (dependencies, CI config, tooling) |

## Naming convention

```
<prefix>/<kebab-case-description>
```

- Lowercase, words separated by hyphens, no accents, no spaces.
- The description reflects the module or RBAC permission concerned when relevant, not an arbitrary ticket number (the project has no external tracker for now).
- Keep it short: 3 to 5 words max after the prefix.

## Concrete examples (aligned with CDC modules)

```bash
git checkout develop
git pull
git checkout -b feature/convocations-degraded-mode

git checkout develop
git pull
git checkout -b feature/audit-log-health-data-access

git checkout develop
git pull
git checkout -b fix/upsert-user-responses-duplicate

git checkout main
git pull
git checkout -b hotfix/mfa-admin-bypass

git checkout develop
git pull
git checkout -b release/1.1.0-cotisations
```

## Instructions for Claude

1. Identify the type of work requested (new feature, fix, production emergency, release prep, technical task) and derive the prefix from it — never leave a branch without a prefix.
2. Check the correct parent branch before creating the branch: `hotfix/*` branches from `main`, everything else branches from `develop` unless the user explicitly says otherwise.
3. Always `pull` the parent branch before creating the new branch, to avoid branching from a stale state.
4. Propose a branch name consistent with the convention above before running the command — ask for confirmation if the name is ambiguous rather than guessing.
5. Never create a branch directly on `main` or `develop` for work in progress: these are integration branches, not development branches.