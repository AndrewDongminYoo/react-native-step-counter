# Android Sensor Selection Plan

## Direction and Ownership

Implement [#91](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/91) in the existing primary workspace under the explicit `pr-loop` invocation.
The root owns all edits, staging and external writes.
Use the [contract](../specs/2026-11-09-android-sensor-selection.md) without expanding adjacent issues.

## Steps

1. Add native regressions under `android/src/test/java/com/stepcounter/` using the real module/service paths and existing Mockito/JUnit dependencies.
   Observe original-code failures for false grants, unsupported fallback, stale backend selection and registration failures.
2. Update `StepCounterModule.kt` to refresh actual sensors and permission at start, replace the previous listener safely, and report live capability and registration state.
   Update `services/SensorListenService.kt` to handle absent sensors, Boolean registration results and security failures without null assertions.
3. Update `example/src/App.tsx` and its tests to recheck capabilities after permission requests.
   Align `README.md`, `README.kr.md`, the existing native spec documentation and affected `CLAUDE.md` claims without changing signatures.
4. Run the gates below, inspect documentation claims, and complete a structured local review at the depth required by the final diff.
   Fix confirmed findings sequentially and revalidate affected behavior.
5. Create focused commits, push, open the PR, complete current-head hosted review/CI, read back the final PR body, assign the operator, and perform the delegated gated merge.
   Preserve completion evidence and retire only this loop's owned state.

## Gates

- From `example/android`: `./gradlew :react-native-step-counter-newarch:testDebugUnitTest --no-daemon --console=plain -PreactNativeArchitectures=arm64-v8a`.
  Read test XML and CI execution evidence, including the existing seven session tests.
- From root: `yarn test`, `yarn typecheck`, `yarn prepare`, `yarn pack --dry-run`.
- Run Trunk against explicit changed paths and inspect complete output.
- Confirm current-head Android example and existing iOS workflow checks.

Run one heavy mobile job at a time after checking load and active builds.
No physical device writes are planned.
