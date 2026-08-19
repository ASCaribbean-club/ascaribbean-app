---
name: design-import
description: Use when the user asks to pull, import, retrieve, or sync a specific mockup/screen from the "AS Caribbean" claude.ai/design project into the repo, or wants a design available for po-agent/designer-agent/mentor-agent to reference. Fetches one screen's PNG export via the DesignSync tool and saves it under docs/designs/.
---

# Design import — pull a mockup from claude.ai/design into `docs/designs/`

## Why this exists

designer-agent's first source of truth is `docs/designs/*.png` — PNG mockups exported from Claude Design prototypes, because Claude can read a rendered image but can't meaningfully interpret an interactive `.dc.html` prototype file as a visual. This skill is the bridge: it pulls one specific screen from the "AS Caribbean" claude.ai/design project into that folder so designer-agent and mentor-agent can use it as a reference, and so po-agent can see what's already been prototyped when scoping a feature.

## The project

- Name: `AS Caribbean`
- projectId: `e7fa6de4-7d5b-42a5-93ff-f75669e9adbf`
- Type: `PROJECT_TYPE_PROJECT` (a regular design project, not a Design System project) — it will **not** appear in `DesignSync list_projects`, which only lists writable design-system projects. Use `DesignSync get_project` with the projectId above to confirm access instead.

## Steps

1. **Confirm access.** Call `DesignSync get_project` with the projectId above. If it errors or reports no access, tell the user to run `/design-login` — reading this project needs the dedicated design authorization, which is separate from the normal claude.ai login.
2. **List files.** Call `DesignSync list_files` with the projectId. The project holds versioned iterations named like `[vN] [Role] Mob/Web - Screen (qualifier).dc.html`, each with a matching rendered export in `screenshots/<slug>.png` when one has been made.
3. **Resolve the request to a path.** Match what the user asked for (e.g. "v4 coach dashboard", "convocations mobile") against the file list:
   - Prefer the `screenshots/*.png` entry — it's a rendered image Claude can actually read.
   - If several versions could match, ask which version rather than silently grabbing the latest — v1 through v4 are real design iterations, not just refinements of the same screen.
   - If only the `.dc.html` prototype exists and no PNG export has been made, **stop and tell the user** — per designer-agent's own rule, an un-exported prototype isn't a usable reference. Ask them to export a PNG from Claude Design first, then re-run this skill. Do not read or summarize the `.dc.html` file as a substitute for a visual.
4. **Fetch the PNG.** Call `DesignSync get_file` with the resolved `screenshots/*.png` path. The response's `content` field is base64-encoded image bytes.
5. **Name it per the existing convention**, matching `docs/designs/v4_coach_dashboard.png` exactly: `v<N>_<role>_<screen>[_web][_qualifier].png`, all lowercase snake_case, no accents, no spaces, no brackets, no parentheses. Derive it mechanically from the source `.dc.html` title, in this order:
   1. Strip the `[vN]` and `[Role]` brackets, keep their contents.
   2. Drop the `Mob` token entirely (mobile is the implicit default per `CLAUDE.md` §1 — no suffix for it).
   3. Keep the `Web` token, but move it to a trailing `_web` suffix instead of its original position.
   4. Drop a parenthetical qualifier (e.g. `(allégé)`, `(clair)`) entirely, *unless* the resulting name would collide with a different existing file in `docs/designs/` — only then keep it, as a trailing suffix after `_web` if both apply.
   5. Lowercase everything, strip accents (é→e, î→i, etc.), replace remaining spaces/hyphens with a single `_`, collapse repeats.

   Worked examples:

   | Source title | → | Filename |
   |---|---|---|
   | `[v4] [Coach] Mob - Dashboard (allégé)` | → | `v4_coach_dashboard.png` |
   | `[v1] [Coach] Web - Dashboard` | → | `v1_coach_dashboard_web.png` |
   | `[v2] [Coach] Web - Dashboard (clair)` | → | `v2_coach_dashboard_web.png` (or `v2_coach_dashboard_web_clair.png` only if `v2_coach_dashboard_web.png` already exists and refers to a different variant) |
   | `[v3] [Coach] Mob - Détail Entraînement` | → | `v3_coach_detail_entrainement.png` |
   | `[v3] [Coach] Mob - Détail Événement` | → | `v3_coach_detail_evenement.png` |
   | `[v1] [Joueur] Mob - Calendrier` | → | `v1_joueur_calendrier.png` |
6. **Decode and write.** Base64-decode `content` and write the binary PNG to `docs/designs/<derived-name>.png`.
7. **Confirm to the user**, naming the exact path written. No further wiring is needed for designer-agent — it already treats `docs/designs/*.png` as its priority-1 source of truth, and mentor-agent follows the same reference when implementing presentation components. If po-agent's spec-writing pass runs later, mention that a matching mockup now exists so it can note it in scope, but leave any UI interpretation to designer-agent.

## Rules

- Never write the `.dc.html` prototype file itself into the repo — only PNG exports. Prototypes are large, interactive, and not what designer-agent/mentor-agent are built to read.
- Never overwrite an existing file in `docs/designs/` without telling the user what's being replaced — a spec already written may cite the old file by name.
- If the user asks for "the latest" without naming a screen, list the candidate `[vN] ...` matches and ask which one instead of guessing.
