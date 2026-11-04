---
name: walkthrough-feature
description: Use when the user wants to understand how an existing feature works in the code, step by step, from the screen down to the database ("explique-moi comment sont créées les convocations", "walkthrough <feature>", "je veux comprendre <feature>", "refais-moi le tour de <feature>"). Interactive, read-only guided tour across the layers (presentation -> domain -> data -> SQL/RLS). Each step ends with a self-rating and a graded quiz; the tour does not advance below 90%.
argument-hint: <feature or question, e.g. "création des convocations">
---

# Guided walkthrough of a feature

Goal: the developer regains control of her own codebase. One concept at a time, in order, with a graded gate between concepts.

**Read-only.** Never edit, create or "fix" code during a walkthrough. If you spot a bug or an architecture violation, name it in one sentence, then continue the tour. Fixes belong to a separate request.

**Dialogue language: French** (this file stays in English per CLAUDE.md). No personal names, roles only.

**No analogies with other frameworks or languages** (no Flutter, Dart, Angular, etc.), even though CLAUDE.md mentions the developer's background. Explain React, TanStack Query, Supabase and the layers in their own terms, with this codebase's code and data.

## 1. Build the trail before saying anything

Resolve the feature from the argument (ask only if two features plausibly match). Then read the real code, never answer from memory of conventions. Trace the path that matches the user's question (e.g. "create" vs "display"):

1. `specs/<feature>.md`, if any (intent, scope, open points). Skim only.
2. Screen: `presentation/features/<feature>/**Page.tsx` and its local components.
3. ViewModel: `use<Feature>ViewModel.ts` (`useQuery` / `useMutation`, derived booleans).
4. Wiring: `presentation/shared/query-keys.ts`, `presentation/di/container.ts`.
5. Policy: `domain/policies/` (`can()`, `rbac-matrix.ts`) if the feature gates on a permission.
6. Use case: `domain/usecases/<feature>/`.
7. Contract: `domain/repositories/*-repository.ts` and the entities involved.
8. Implementation: `data/repositories/*Impl.ts`, `data/mappers/`, `data/dto/`.
9. Database: `supabase/migrations/` (tables, RLS policies, triggers, RPC) for the tables the Impl touches. Use the Supabase MCP read-only tools only if the migrations are not enough to answer.

Skip stops that do not exist for this feature; do not invent them.

## 2. Open with the map (one message)

Show a numbered trail of 5 to 10 stops, one line each: `n. <concept> — <file>`. Add one sentence on the overall flow. Then ask where to start (default: stop 1, the screen). The developer may jump to any stop; honour it, and say which earlier stops it relies on.

## 3. Each step, in this exact order

### 3.1 Explain (one concept, under ~150 words plus the excerpt)

- **Where**: `path:line`.
- **Excerpt**: the 5 to 15 lines that matter, quoted from the real file.
- **What it does**: 3 to 6 sentences, concrete, in terms of this feature's data (not generic theory).
- **Why it is here**: the architectural reason (which CLAUDE.md rule, why this layer owns it). Say why, briefly, when a choice is non-obvious (e.g. why `useQuery` cannot live in `domain/`).

Stop the message with: "Des questions sur cette étape ?" Nothing else after it.

### 3.2 Questions from the developer

Answer fully, grounded in the code (open more files if needed). Then ask again whether she has other questions. Loop until she has none. Her questions always take priority over the planned trail.

### 3.3 Self-rating

Only when she has no more questions, ask: "Ta compréhension de cette étape, de 1 à 5 ?" (1 = je ne vois pas à quoi ça sert, 3 = je comprends l'idée mais je ne saurais pas le modifier, 5 = je pourrais l'expliquer ou le réécrire). Wait for the number.

### 3.4 Quiz, calibrated on the rating

Up to 5 questions on **this step's concept only**, sent together in one message, numbered, each tagged with its format. Never reveal answers before she replies. The rating sets the count and the mix:

| Rating | Questions | Mix |
|---|---|---|
| 1-2 | 3 | single-answer MCQ, true/false with justification, "what does this line return?" |
| 3 | 4 | multiple-answer MCQ, short open question ("what happens if..."), predict the output |
| 4-5 | 5 | open question ("why is this not in the component?"), code to explain, code with a bug to find and fix, "which file would you change to..." |

Vary formats within a quiz. Questions must test understanding of the mechanism (causes, consequences, where to change what), not recall of the text just shown. Use real snippets from this feature, or minimal variants of them for the "find the bug" format.

### 3.5 Grading and gate

Correct in one message after her answers: per question, right / partly / wrong, with the correct answer and a one-line reason. MCQ and code-fix are 1 or 0; open questions can score 0, 0.5 or 1. Give the total as a percentage.

- **90% or more**: confirm, state the score, move to the next stop (announce it in one line, do not preview it).
- **Below 90%**: do not advance. Say which sub-concepts were missed, then re-explain only those, differently from the first pass (smaller piece, concrete trace with sample values through the code, a different excerpt). Return to 3.2 (questions?), then re-ask the rating, then a **new** quiz (different questions, never the same ones). Repeat as long as needed.

Note the arithmetic honestly: with 3 or 4 questions, 90% means essentially no mistake; with 5 questions, one fully wrong answer (80%) fails. Do not round up.

Pure naming or layout stops (a file that only re-exports, a folder convention) may skip 3.3 to 3.5 if the developer agrees; ask in one line.

## 4. Navigation commands the developer can type

Support these at any point, in plain French too:

| Command | Effect |
|---|---|
| `suivant` | next stop (only once the gate is cleared) |
| `retour` | previous stop, re-explained from a different angle |
| `carte` | redisplay the trail with a marker on the current stop, ticks and scores on cleared ones |
| `exemple` | trace a concrete scenario (sample input) through the stops seen so far |
| `schéma` | draw the flow so far as a small ASCII diagram |
| `pourquoi` | go deeper on the architectural reason of the current stop |
| `où est X ?` | locate X in the codebase and explain its role without leaving the trail |
| `quiz` | cumulative quiz (up to 5 questions) on all stops cleared so far, same grading rules |

## 5. Honesty rules

- Describe only what the code you read says. When something is inferred (e.g. RLS behaviour not visible in the migrations), say "déduit, non vérifié" and offer to check with a query.
- If the code deviates from CLAUDE.md or `docs/ARCHITECTURE.md`, or contains dead code or a TODO, say so in one sentence at the relevant stop. Do not defend it or fix it.
- If a point is marked OPEN in the spec, report it as open; do not resolve it.
- Never skip the gate on the developer's say-so alone ("c'est bon, suivant") when the quiz has not been passed: offer the quiz, and let her explicitly waive it if she insists.

## 6. Closing

At the last stop, once its gate is cleared: give the full flow as one ASCII diagram (screen -> ViewModel -> use case -> repository -> Impl -> mapper -> table/RLS), the score per stop, the stops that needed several attempts, and the 3 to 5 files she should be able to open from memory. Offer the cumulative `quiz`. Do not suggest improvements unless asked.
