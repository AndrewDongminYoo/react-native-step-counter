# Bounded example logs implementation

1. Add long-stream retention, rendered-row and clipboard regressions to `example/src/__tests__/App.test.tsx`; observe the unbounded implementation fail.
2. Centralize accepted, filtered and diagnostic appends with a 200-entry cap and correct session IDs in `example/src/App.tsx`.
3. Add launch-time logging configuration and regressions proving disabled logging skips payload serialization, state accumulation and LogCat rendering.
4. Keep auto-scroll working after capped replacements in `example/src/LogCat.tsx`, with a focused regression in its existing test file.
5. Document the cap, eviction/copy behavior and repeatable logging-off procedure in `example/README.md`.
6. Run `yarn test`, `yarn typecheck`, `yarn prepare` and scoped `trunk check --monitor=false`; review the complete candidate against #104, then commit, push and complete the authorized PR lifecycle.

Owned paths: the two example components, their existing test files, one example logging configuration module, `example/README.md`, and these spec/plan documents.
No mobile build is required for this JavaScript-only behavior change; hosted native integration checks remain required if triggered.
