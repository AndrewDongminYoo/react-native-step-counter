# Typed native event implementation

## Direction and ownership

The operator approved issue #101 through `pr-loop` on 2026-11-10.
Use the existing workspace and branch `feat/101-typed-native-events`; no worktree is needed.
The root owns all changes and Git actions.

## Steps

1. Add failing generated-event JS adapter regressions for callback delivery, independent listeners, synchronous emission, start/stop failure and diagnostics.
2. Define typed events in `src/NativeStepCounter.ts`; adapt `src/index.tsx` without changing callback ownership.
3. Use generated Android emitters in the module/services and generated iOS Spec base; normalize errors and make native-only methods internal.
4. Adapt actual native transport fixtures and prove generated callbacks carry the expected events, preserving existing sensor/session coverage.
5. Run `yarn test`, `yarn typecheck`, `yarn prepare`, Android unit tests and iOS native suites; compile examples and packed consumers in CI.
6. Check bridgeless runtime event delivery separately from compile and fixture results.
7. Reconcile applicable README, CLAUDE and event documentation; inspect the complete diff with independent native/JS review and repair verified findings.
8. Create scoped commits, push, open the PR, verify current-head CI and hosted reviews, assign the operator, merge the exact reviewed head and preserve a visible completion receipt before retiring owned state.

## Primary paths and checks

Owned paths: `src/`, `android/src/main/`, affected `android/src/test/`, `ios/StepCounter.*`, `tests/ios/`, `jest.setup.ts`, directly affected example/tests, `.github/workflows/native-ios.yml`, `tsconfig.build.json` and docs.
Do not modify unrelated files, package versions or Trunk configuration.
Minimum commands: `yarn test`, `yarn typecheck`, `yarn prepare`, `bash tests/ios/run-session-tests.sh`, Android `:react-native-step-counter-newarch:testDebugUnitTest`, scoped Trunk and both native CI workflows.
Keep one heavy mobile job active at a time and check machine load before launching it.
