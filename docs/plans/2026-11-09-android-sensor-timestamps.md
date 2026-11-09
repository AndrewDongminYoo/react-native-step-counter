# Android measurement-time implementation plan

## Scope and ownership

Use the existing workspace and `fix/android-sensor-timestamps` branch.
The root owns the three Android sensor services, their native regression tests, this contract, and directly affected existing documentation.
Preserve the public JavaScript API and existing hardware counting and registration behavior.

## Steps

1. Add real-service timestamp replay tests with mocked hardware, Android clock boundaries, and React Native JNI/event delivery only.
   Observe wrong epoch dates and compressed accelerometer counts against the original code.
2. Propagate measurement nanoseconds, establish a fixed session epoch anchor, and serialize reset/sample state with a service lock.
   Reject non-increasing measurement timestamps before detector mutation.
3. Verify immediate, delayed and batched replay, wall-clock adjustments, suspend, refractory boundaries, restart, and competing reset/emission.
   Retain red/green logs outside the checkout.
4. Inspect README and governing instructions for affected timestamp claims and update only implementation-caused drift.
5. Run native unit tests, Jest, typecheck, distributable build, scoped Trunk, and Android integration compilation.
   Verify the existing Linux/JDK 17 CI actually executes native tests after publication.
6. Review the full candidate and acceptance omissions, commit scoped changes, then continue the PR loop through current-head reviews and gated merge.

## Minimum verification

```sh
cd example/android
./gradlew :react-native-step-counter-newarch:testDebugUnitTest --no-daemon --console=plain -PreactNativeArchitectures=arm64-v8a
```

```sh
yarn test
yarn typecheck
yarn prepare
yarn example build:android
trunk check --filter=ktlint,markdownlint,prettier,git-diff-check --monitor=false <changed-paths>
```

Read native test XML and CI logs to distinguish executed tests from compilation or mocked JS checks.
