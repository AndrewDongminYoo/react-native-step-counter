# iOS Live Session Interval Plan

Direction: implement [#93](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/93) under the explicit PR-loop request.

1. Extend `tests/ios/StepCounterSessionTests.mm` with real-module interval regressions and observe wrong metrics/dates and failure catch-up before implementation.
2. Update `ios/StepCounter.mm` to retain a cutoff and optional baselines, use a first-sample fallback, and reject stale/decreasing intervals without rebasing.
3. Correct affected API comments in `src/index.tsx`, README guidance, and the native test description in `CLAUDE.md`.
4. Run `bash tests/ios/run-session-tests.sh`, native payload fixtures, `yarn test`, `yarn typecheck`, `yarn prepare`, and scoped `trunk check --monitor=false`.
5. Review production interval handling and test/contract completeness independently, apply confirmed fixes sequentially, then commit explicit paths and open the PR.
6. Verify exact-head CI and hosted review, finalize the body and assignment, merge under invocation authority, and preserve evidence before retiring owned control state.

Only the root stages, commits, or mutates GitHub.
No new dependencies, generated-output edits, release changes, physical-device writes, or unrelated cleanup are in scope.
