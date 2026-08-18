---
description: Review a feature's implementation against its spec and ARCHITECTURE.md, using the developer-agent in annotation-only mode.
argument-hint: <feature-name>
---

# /review-feature

Feature name: $ARGUMENTS

1. Confirm `specs/$ARGUMENTS.md` exists. If it doesn't, stop and say the feature has no spec to review against — `/feature-implementation` needs to run first.

2. Gather the changed files for this feature: run `git diff develop...HEAD --stat` and `git diff develop...HEAD` to get the actual changes (assume the developer is working on the feature branch for `$ARGUMENTS`, per the branch-creation convention). If the diff is empty, stop and say there's nothing to review yet.

3. Use the developer-agent to review the diff against `specs/$ARGUMENTS.md` and `ARCHITECTURE.md`.

4. Present the developer-agent's annotations as-is, grouped by blocking vs suggestion. Do not summarize away blocking issues, do not apply any fix yourself, and do not offer to apply fixes even if asked — that decision belongs to `/feature-implementation`'s TODO loop, not to this command.

5. If the review comes back clean, say so plainly and mention this feature is ready for a pull request into `develop`.