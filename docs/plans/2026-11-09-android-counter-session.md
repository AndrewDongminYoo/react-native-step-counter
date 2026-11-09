# Android counter session implementation plan

Approved direction: implement [#90](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/90) through `pr-loop`.
Use the existing workspace and preserve the unrelated `.trunk/trunk.yaml` edits.

1. Add JUnit and Mockito as test-only dependencies in `android/build.gradle` and behavioral tests under `android/src/test/`.
2. Run `:react-native-step-counter-newarch:testDebugUnitTest` from `example/android` and observe failures for zero, duplicate readings and restart before changing the service.
3. Correct `StepCounterService.kt` with a nullable baseline and explicit increase checks; retain unconditional session reset.
4. Add the same unit-test task to `.github/workflows/native-android.yml` before the example build.
5. Run native tests, `yarn test`, `yarn typecheck`, `yarn prepare`, scoped Trunk checks and the example Android build when machine capacity permits.
6. Review the complete candidate and affected documentation, publish one coherent fix, then verify current-head CI and hosted reviews before the delegated merge.

The regressions must read real numeric results and event eligibility, rather than source text or mocked counting logic.
The work has no visual output change and requires no visual approval.
