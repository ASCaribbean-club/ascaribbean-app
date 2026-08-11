# Architecture setup prompt — AS Caribbean

> Meant to be run once (or reproducibly on a reset) at the very start of the project, before any functional code. Can be used as-is as an initial prompt, or later wrapped into a `/setup-architecture` command.

---

Read `ARCHITECTURE.md` in the docs folder in full before doing anything. It is the single source of truth for this task — do not fill gaps with generic Clean Architecture knowledge if `ARCHITECTURE.md` specifies something different.

Your task: create the project's folder structure (no functional code, only structure and the configuration files needed to start it) while strictly respecting these points, which take precedence over any generic practice you might know:

1. **Strict separation of the three layers** `domain/`, `data/`, `presentation/` — no import should ever go from a layer up into a layer that depends on it (e.g. `domain/` must never import from `data/` or `presentation/`).
2. **Non-negotiable naming conventions**:
   - Use cases live in `domain/`, suffixed `UseCase` (e.g. `CreateConvocationUseCase`).
   - Repository interfaces live in `domain/repositories/`, no suffix.
   - Implementations live in `data/repositories/`, suffixed `Impl` (e.g. `ConvocationRepositoryImpl`).
   - Every repository has an associated mapper in `data/mappers/` — never create a repository without its mapper, even if empty at first.
3. **`presentation/` is mobile-only for this phase** — do not anticipate a desktop structure, do not create empty folders "just in case".
4. **A single centralized `query-keys.ts` file** — never let a query key be defined locally inside a hook or a component.
5. `useXxxViewModel` hooks are the only place where a `queryFn` calls a use case — never a direct call from a component.
6. The PWA setup (`vite-plugin-pwa`) and its config are part of the initial setup, not a later iteration — manifest, base caching strategy, service worker.
7. Before creating a file or folder, check whether it already exists and never overwrite a file that already exists and is non-empty — when in doubt, list what already exists and ask for confirmation instead of overwriting.

Once the structure is in place, produce an output that lists:
- the folder structure created (full tree),
- any decision you had to make because `ARCHITECTURE.md` didn't explicitly settle the case,
- what you deliberately did not create (e.g. desktop-layer folders) and why.

Do not generate any full feature example at this stage — this prompt sets up the structure, not a first vertical slice. If you need an example of how a feature should traverse the three layers once the structure is in place, refer separately to `exemple-vertical-slice.md`, do not execute it as part of this prompt.

---

## Points left open by this prompt (to settle if needed before use)

- Should this prompt also initialize Supabase (schema, base RLS) or only the front-end structure? Not settled here — currently scoped to front-end only.
- Should this generate a `CLAUDE.md` at the root listing the permanent rules (naming conventions, this list of non-negotiable points) so future agents (Mentor, Developer) find them automatically without re-reading all of `ARCHITECTURE.md` every time? Recommended, but not included in this prompt — add it if you want this done in the same pass.