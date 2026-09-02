---
name: clean-comments
description: Use when the user asks to remove, review, or clean up inconsistent/stale comments in the current changes (git diff or new files) — e.g. "remove unconsistent comments", "clean up comments", "check comment consistency" — typically after a feature pass. Flags comments whose claims are wrong or stale relative to the code, or that reference something (a file, another comment, a value, a section) that doesn't actually match reality, and treats a TODO/FIXME-labeled comment as inconsistent when it doesn't point to a genuine pending action or decision.
---

# Clean up inconsistent comments

## Scope

Only touches comments introduced or modified in the **current changes** — the working tree's diff against its base (tracked modifications + new untracked files) — never a general sweep of the whole codebase, unless the user explicitly asks for that wider scope.

## What counts as an inconsistent comment

1. **Contradicts the code next to it.** The comment describes a value, height, class, condition, or behavior that the code doesn't actually have (e.g. a comment says "trims to h-9" while the class applied is `h-8`).
2. **Stale relative to a change in the same diff.** The code was updated to resolve something (a stub became a real implementation, a route was added, a TODO was acted on) but the comment describing the old state was left untouched.
3. **References something that doesn't exist or doesn't say what's claimed.** A pointer to another file's TODO/comment/section that isn't actually there, a wrong section/AC id, a mechanism (RLS, view, `security_invoker` vs. `SECURITY DEFINER`, etc.) that doesn't match what the referenced migration/file actually does.
4. **A TODO/FIXME that isn't a real one** — see below.

## TODO/FIXME must gate on a genuine future action or decision

A `TODO`/`FIXME` comment earns its keyword only when it flags something concretely unresolved: a decision not yet made, a fix deliberately deferred, a follow-up conditioned on a future event ("revisit once X exists", "fix here or accept the gap — not resolved silently"). If a comment carries the TODO keyword but doesn't actually ask for anything to happen — it just narrates a settled fact, a permanent by-design behavior, or work that the surrounding diff already finished — treat it as inconsistent, exactly like a factual mismatch, and either reword it as a plain explanatory comment (drop TODO) or delete it if nothing worth keeping remains once the label is gone.

**Quick test:** strip the word "TODO" — does the sentence still describe a pending ask ("bump to X", "pick a rule and document it", "fix here or accept for now")? If yes, it's real, keep it. If what's left is just a statement of fact or design rationale, the TODO framing was wrong — fix or remove it.

Examples:
- Keep: `TODO(PO-6): ... pick a deterministic rule and document it here` — pending decision, someone still has to choose the rule.
- Keep: `TODO ... Fix here (affects both X and Y) or accept the current rendering for now — flagged rather than silently changed` — a live either/or decision.
- Remove/reword: `TODO: same as above — detail route belongs to Calendrier.` sitting right above code that already calls `navigate(...)` to a real route added in the same diff — the "TODO" describes a state the diff itself just resolved.
- Remove/reword: `TODO(...): team selector pill click — no-op in v1 by design.` — states a permanent, already-decided behavior; nothing is pending, so the TODO label itself is the inconsistency even though the sentence is true.

## Process

1. Get the change set: `git diff` for tracked files, plus the full content of new (`??`) files from `git status --porcelain`. Scope to files actually touched — don't go hunting in untouched files.
2. Pull out every comment that's new or modified in that scope (diff hunks with a `+` line containing `//`, `/*`, `#`, or similar).
3. For each one, verify its claim against the actual code right below/around it, and against anything else it names — another file, another comment, a spec section, an AC id, a migration, a constant, a class name/value.
4. For each TODO/FIXME found in scope, apply the strip test above.
5. Fix in place — reword the smallest span needed to remove the wrong/stale/misused-TODO claim, or delete the comment entirely if nothing accurate remains. Never touch the surrounding code's logic; this is comment-only.
6. When a stale claim is echoed in more than one place (e.g. a router comment describing two TODOs, one of which got resolved elsewhere in the same diff), fix every echo, not just the first one found.
7. Report back a short list of what was fixed and why — file, the wrong/fake claim, and the correction. No need to narrate comments that were checked and found fine.

## What NOT to do

- Don't remove a comment just because it's long, or because of a general "prefer no comments" preference — dense, spec-traceable WHY comments are this project's established style; only touch a comment because it's *wrong*, *stale*, or a *misused TODO*, not because it's verbose.
- Don't invent a "correct" value to make a wrong comment true (e.g. don't guess a new height and repeat it in the comment) — either state the fact generically/accurately or drop the specific claim.
- Don't resolve the underlying issue a genuine TODO points to — fixing the code it describes is a separate, explicit ask.
