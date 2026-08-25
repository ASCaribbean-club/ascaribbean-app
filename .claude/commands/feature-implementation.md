---
description: Run the PO → Designer → Mentor pipeline for a feature, stopping at scaffolding with TODOs for the developer to implement.
argument-hint: <feature-name>
---

# /feature-implementation

Feature name: $ARGUMENTS

Follow these steps in order. Do not skip a step, do not merge two steps into one pass, and do not proceed to the next step if the current one reports an open question that blocks it.

0. Check whether the current git branch is a `feature/*` branch for this feature (i.e. `feature/$ARGUMENTS` or a name clearly matching it).
   - If the current branch already matches, continue on it — do not create a new one.
   - Otherwise, invoke the `branch-creation` skill to create `feature/$ARGUMENTS` (or a name adapted from it per the skill's naming convention) from `develop`, then continue the pipeline on that branch.
   - Never run the rest of this pipeline directly on `main` or `develop`.

1. Check whether `specs/$ARGUMENTS.md` already exists.
   - If it doesn't, or it exists but has no Scope/RBAC section yet: use the po-agent to write it.
   - If po-agent reports a blocking open question, stop here and surface it — do not proceed to design.

2. Check whether `specs/$ARGUMENTS.md` has a UI design section yet.
   - If not: use the designer-agent to append one.
   - If designer-agent reports a blocking open question, stop here and surface it — do not proceed to scaffolding.

3. Use the mentor-agent to scaffold the Clean Architecture skeleton (`domain/`, `data/`, `presentation/`) for this feature, based on the full spec now in `specs/$ARGUMENTS.md`.

4. Report to the developer:
   - The final state of `specs/$ARGUMENTS.md` (path only, don't repeat its full content).
   - The list of files scaffolded by mentor-agent.
   - Where the TODOs are and what each one is asking.

Do not implement any TODO yourself in this command, even if the fix seems obvious — that's the developer's step, and it's the point of the whole pipeline. Do not invoke developer-agent from this command; review happens separately via `/review-feature` once the developer has implemented the TODOs.