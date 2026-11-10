# iOS Live Session Interval Plan

Direction: implement [#93](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/93) under the explicit PR-loop request.

1. Extend `tests/ios/StepCounterSessionTests.mm` with real-module interval regressions and observe wrong metrics/dates and failure catch-up before implementation.
2. Update `ios/StepCounter.mm` to retain a cutoff and optional baselines, use a first-sample fallback, and reject stale/decreasing intervals without rebasing.
3. Correct affected API comments in `src/index.tsx`, English/Korean README guidance, the native test description in `CLAUDE.md`, and regenerate the HTML API pages with the existing `jsdoc-config.json`.
4. Run `bash tests/ios/run-session-tests.sh`, native payload fixtures, `yarn test`, `yarn typecheck`, `yarn prepare`, and scoped `trunk check --monitor=false`.
5. Review production interval handling and test/contract completeness independently, apply confirmed fixes sequentially, then commit explicit paths and open the PR.
6. Verify exact-head CI and hosted review, finalize the body and assignment, merge under invocation authority, and preserve evidence before retiring owned control state.

Only the root stages, commits, or mutates GitHub.
No new package dependencies, distributable `lib/` commits, release changes, physical-device writes, or unrelated cleanup are in scope.

## Generated documentation

Reuse the documented tooling from `2026-11-09-native-payload-contract.md`: JSDoc 3.6.11, tsd-jsdoc 2.5.0, and postman-jsdoc-theme 0.0.3 in a temporary tooling directory.
Generate from the built `lib/` source and English README using the existing config, copy only the five HTML pages, and format those explicit paths with existing Prettier.
Theme assets and package dependencies remain unchanged.
These generated pages describe API behavior; no layout or visual design changes are involved.
