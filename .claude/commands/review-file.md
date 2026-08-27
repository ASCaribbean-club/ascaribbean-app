---
description: Review a single file with the developer-agent in annotation-only mode — works with or without a matching specs/<feature>.md.
argument-hint: <file-path>
---

# /review-file

File path: $ARGUMENTS

1. Confirm the file exists at the given path. If it doesn't, stop and say so — don't guess at a nearby filename.

2. Try to find a matching spec: if the path falls under a recognizable feature folder (e.g. `presentation/features/<feature>/`, `domain/usecases/<feature>/`), check whether `specs/<feature>.md` exists.

3. Use the developer-agent to review the file:
   - If a matching spec was found in step 2, review against `specs/<feature>.md` and `docs/ARCHITECTURE.md`.
   - If no matching spec was found, tell the developer-agent explicitly that none exists so it reviews against `docs/ARCHITECTURE.md` and `CLAUDE.md` conventions only, per its own rules for spec-less reviews.

4. Present the developer-agent's annotations as-is, grouped by blocking vs suggestion. Do not summarize away blocking issues, do not apply any fix yourself, and do not offer to apply fixes even if asked.

5. If the review comes back clean, say so plainly.
