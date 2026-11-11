# Reproducible benchmark fixtures

Issue: [#108](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/108).

## Contract

Provide deterministic stationary, walking, rapid motion/rotation, delayed-batch and long-session teardown inputs, plus an opt-in host benchmark and raw-result validator runnable on Linux without credentials or a device.
Measure the actual Android fallback processor and payload builder separately, using an explicitly identified JVM map double for the JNI boundary.
Measure the actual JavaScript filter separately from example React commit observations.
Never label host replay as native-to-JS delivery, Core Motion latency, device CPU or battery evidence.

## Scope

Keep the library API and native production paths unchanged.
Add benchmark-only fixtures, runners, validation and CI artifact collection.
Add disabled-by-default example timing with independent logging and event-render controls, bounded storage, warm-up and a fixed measurement window.
Define versioned raw results, clock domains, repeatability, Release/Hermes device procedures and comparison rules in a contributor guide.
Real sensor accuracy, device baselines and architecture decisions remain follow-up work in #109 and #110.

## Acceptance

- A checkout can generate identical trace bytes and run native/JS replay with documented JDK, Android SDK, Node and Yarn prerequisites.
- Native processing and payload construction have separate samples; map-double overhead is disclosed.
- All five traces have explicit expected outcomes, including delayed-batch chronology and no delivery after teardown.
- Raw result validation rejects malformed metadata, non-finite/negative timings, mismatched counts and unsupported stage/environment claims.
- Example measurements discard warm-up, stop after a fixed interval and retain bounded samples; disabling rendering still executes filtering, and disabling logging avoids serialization.
- Device instructions specify Release/Hermes, same-clock trace correlation, repeated runs, metadata and unavailable measurements.
- Jest, TypeScript, package build, scoped lint and Android JVM checks pass; CI exercises the harness and retains raw files without timing thresholds.

## Review limits

Default example layout and styles remain unchanged, so aesthetic approval is not required.
Synthetic traces do not establish step accuracy or real sensor timing.
React commit latency includes scheduling and coalescing, and excludes GPU presentation.
