---
description: Run the PO → Designer → (Mentor | Implementer) pipeline for a feature. Default mode implements the feature with tests; learn mode stops at scaffolding with TODOs for the developer to implement.
argument-hint: <feature-name> [--mode learn|default]
---

# /feature-implementation

Raw arguments: $ARGUMENTS

## 0. Parse arguments

Extract the mode flag from `$ARGUMENTS` before doing anything else:

- Accepted forms, anywhere in the arguments: `--mode learn`, `--mode=learn`, `--mode default`, `--mode=default`, or the shorthand `--learn`.
- Strip whatever flag you find from the arguments string; what remains (trimmed) is the **feature name**.
- If no mode flag is present, the mode is `default`.

Mode meaning:
- `learn` — stop at scaffolding: mentor-agent generates the Clean Architecture skeleton with sparse, guiding TODOs for the developer to fill in herself. This is the original/only behavior before the mode flag existed.
- `default` — implementer-agent builds the feature fully, including tests, and reports what it built.

State the resolved feature name and mode back to the user in one line before continuing (e.g. "Feature: web-actus, mode: default").

Follow the remaining steps in order. Do not skip a step, do not merge two steps into one pass, and do not proceed to the next step if the current one reports an open question that blocks it.

1. Check whether the current git branch is a `feature/*` branch for this feature (i.e. `feature/<feature-name>` or a name clearly matching it).
   - If the current branch already matches, continue on it — do not create a new one.
   - Otherwise, invoke the `branch-creation` skill to create `feature/<feature-name>` (or a name adapted from it per the skill's naming convention) from `develop`, then continue the pipeline on that branch.
   - Never run the rest of this pipeline directly on `main` or `develop`.

2. Check whether `specs/<feature-name>.md` already exists.
   - If it doesn't, or it exists but has no Scope/RBAC section yet: use the po-agent to write it.
   - If po-agent reports a blocking open question, stop here and surface it — do not proceed to design.

3. Check whether `specs/<feature-name>.md` has a UI design section yet.
   - If not: use the designer-agent to append one.
   - If designer-agent reports a blocking open question, stop here and surface it — do not proceed to scaffolding/implementation.

4. Build the feature, based on the full spec now in `specs/<feature-name>.md`:
   - **If mode is `learn`**: use the mentor-agent to scaffold the Clean Architecture skeleton (`domain/`, `data/`, `presentation/`) with TODOs. Do not implement any TODO yourself in this command, even if the fix seems obvious — that's the developer's step, and it's the point of learn mode.
   - **If mode is `default`**: use the implementer-agent to fully implement the Clean Architecture skeleton (`domain/`, `data/`, `presentation/`) plus tests. Do not redo or second-guess its implementation yourself in this command — review happens separately via `/review-feature`.

5. Report to the developer:
   - The final state of `specs/<feature-name>.md` (path only, don't repeat its full content).
   - **Learn mode**: the list of files scaffolded by mentor-agent, and where the TODOs are and what each one is asking.
   - **Default mode**: the list of files implemented by implementer-agent, a summary of the tests added and their pass/fail status, and any piece left unimplemented because of a genuinely blocking open question.

Do not invoke developer-agent from this command in either mode — review happens separately via `/review-feature` once the developer (learn mode) or implementer-agent (default mode) has produced the implementation.
