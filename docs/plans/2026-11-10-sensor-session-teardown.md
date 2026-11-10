# Sensor session teardown implementation plan

1. Add failing JS regressions for owned handle removal, stale handles and external listeners in `src/__tests__/index.test.ts`.
2. Add failing Android module regressions for final listener removal, invalidation, host destruction and queued callbacks in `android/src/test/java/com/stepcounter/StepCounterModuleTest.kt`.
3. Add failing iOS lifecycle and motion-helper regressions under `tests/ios/`, extending hardware doubles only at external boundaries.
4. Implement scoped ownership in `src/index.tsx`, Android lifecycle teardown in the module, and iOS observation/motion cleanup in `ios/StepCounter.mm` and `ios/SOMotionDetecter.m`.
5. Correct affected API comments, README lifecycle claims and CLAUDE test guidance; regenerate documentation from its source if affected.
6. Run focused red/green checks, full declared checks and sequential native example builds; retain visible evidence.
7. Complete independent contract/JS and native lifecycle reviews plus an adversarial cross-check, repair confirmed findings, commit explicit paths and publish the PR.
8. Observe current-head hosted reviews and CI, resolve supported findings, assign the operator at readiness, merge the exact reviewed head and retire owned control state after settled follow-through.

## Ownership and verification

The root owns all edits, Git mutations and final verification in the main workspace.
Reviewers are read-only and scoped to this personal repository.
Minimum commands: `yarn test`, `yarn typecheck`, `yarn prepare`, `bash tests/ios/run-session-tests.sh`, Android `:react-native-step-counter-newarch:testDebugUnitTest`, scoped `trunk check`, and both declared example builds.
Native jobs run sequentially after checking machine load.
