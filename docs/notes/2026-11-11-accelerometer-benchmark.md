# Android fallback replay and microbenchmark

Run on Linux or macOS with JDK 17+, Android SDK and installed Yarn workspace dependencies:

```sh
cd example/android
./gradlew :react-native-step-counter-newarch:testDebugUnitTest --no-daemon --console=plain -PreactNativeArchitectures=arm64-v8a
```

Native Android CI runs this command and uploads JUnit XML as `android-unit-test-results`.
Read `android/build/test-results/testDebugUnitTest/TEST-com.stepcounter.services.AccelerometerReplayTest.xml` for replay errors and benchmark stdout.
Add `--rerun-tasks` to repeat without cached test results.

The frozen legacy implementation retains float scans, normalization and threshold crossing, excluding logging.
The benchmark warms each implementation for 500,000 samples and alternates measurement order across five rounds of 1,000,000 samples each.
Both use the same reusable walking input; input generation and accepted-result consumption are included for both.
Thread allocation counters exclude construction and use the HotSpot management bean via reflection because Android's compile boot classpath excludes JVM management APIs.
Escape analysis is disabled in the unit-test JVM to measure materialized operations consistently; this setting does not affect the shipped library or example app.
The stationary service regression requires less than one byte/sample after warm-up, including reflective measurement overhead.
No timing threshold is enforced.

Local observation on 2026-11-11, macOS arm64, JDK 17.0.21, escape analysis disabled:

| Implementation | Processing ns/sample (five rounds) | Allocated bytes/sample |
| -------------- | ---------------------------------- | ---------------------- |
| Legacy         | 54.63–68.31                        | 104.80                 |
| Running sums   | 9.81–13.19                         | 0.000048–0.012792      |

These are local JVM measurements, including harness overhead, rather than Android CPU or battery measurements.
Linux CI records its own results in the artifact; timings vary with JVM, hardware and JIT state.

Replays cover 6,060 samples each of walking (200 accepted steps), slow rotation, stationary gravity and zero vectors, plus 1,000,000 stationary samples with bounded three-axis noise and a reset/replay comparison.
The service and pure processor must match the legacy accepted sample indices exactly.
Velocity estimate differences must remain at most 0.001; the observed maximum was 0.000057220466.
Double running sums limit accumulation drift; projections retain float arithmetic and a single gravity norm.
Bounded ring indices avoid lifetime counter overflow.
Floating-point reassociation can change decisions for arbitrary signals extremely close to the threshold; these synthetic fixtures do not establish real-world accuracy or bitwise equivalence.
Existing timestamp tests exercise the strict 250ms boundary and restart through the real service lifecycle.

Non-finite sensor samples are rejected before changing detector state, preventing persistent running-sum contamination.
A regression inserts NaN and positive/negative infinity on each axis and checks subsequent walking against an uncontaminated processor.
