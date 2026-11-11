# Sensor and event-delivery benchmarks

This harness supports [#108](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/108); device measurements and architecture decisions follow in #109 and #110.
It adds no library API or native production instrumentation.
Host timings include loop and clock overhead and are not device performance baselines.

## Run from a checkout

Use the repository's Node version (`.nvmrc`), Yarn version (`packageManager`), installed workspace dependencies and, for native replay, JDK 17 and the Android SDK/toolchains in [native compatibility](native-compatibility.md).
No GitHub credentials, connected device, emulator or iOS toolchain are required for these Linux commands.
Use an output directory outside the checkout to avoid recording benchmark outputs as source changes.

```sh
yarn install --immutable
node --test tests/benchmarks/*.node.mjs
node tests/benchmarks/run.mjs node /tmp/step-benchmark-js
node tests/benchmarks/run.mjs jvm /tmp/step-benchmark-native
node tests/benchmarks/results.mjs /tmp/step-benchmark-js/node-result.json /tmp/step-benchmark-native/jvm-result.json
```

The native command deliberately reruns the Gradle test task instead of accepting cached results.
CI uploads `benchmark-js`, `benchmark-native` and native JUnit XML; no timing threshold gates a shared worker.
The ordinary Jest suite also checks replay correctness, while the native benchmark test skips timing work unless its explicit output/input environment variables are present.

## Frozen inputs and measured boundaries

`tests/benchmarks/traces.json` defines five deterministic recipes.
`generate.mjs` materializes reusable CSV vectors before native timing starts; its recipe/source SHA-256 is recorded as `fixtureHash`.
Changing either input recipes or generation code changes this identity.
Inputs are synthetic, not recordings of a person's gait, and do not establish counting accuracy.

| Scenario          | Native input                                                                                             | JS input and expected behavior                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `stationary`      | 6,060 gravity samples; zero accepted steps                                                               | 120 zero-step reports, all accepted                                                                                               |
| `walking`         | 6,060 samples with 30-sample impulses after warm-up; 200 steps                                           | 120 reports, one step/second, all accepted                                                                                        |
| `rapid_rotation`  | 6,060 rapidly rotating gravity vectors; compare each decision to frozen legacy arithmetic                | 120 reports adding 100 steps/second; burst rebasing leaves four accepted plateaus, last accepted total 400                        |
| `delayed_batches` | Same walking samples and expected decisions                                                              | Same measurement dates as walking, delivered in logical batches of 20 at offsets 20,000ms, 40,000ms, etc.; all 120 accepted       |
| `long_teardown`   | 100,000 samples, 3,332 steps; additional service lifecycle test rejects 10,000 queued samples after stop | 10,000 valid reports; separate owned-subscription test delivers 10,000 before removal and none from the detached source afterward |

Host replay runs batches immediately without sleeping; it preserves measurement chronology and asserts arrival-offset grouping, rather than simulating an OS scheduler.
The native delayed-batch processor replay intentionally has identical sample timestamps to walking; service batching semantics also have existing `SensorTimestampTest` coverage.

| Stage               | Host measurement                                                                                                                                      | Device measurement                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `native_processing` | Actual `AccelerometerProcessor.update`; 10 full warm-up passes, five measured passes, fresh state before each pass                                    | Android sensor callback/processor trace; iOS receives Core Motion aggregates rather than the Android fallback algorithm |
| `payload_creation`  | Actual `stepsParamsMap` getter; 2,000 maps/pass, 10 warm-up and five measured passes; `JavaOnlyMap` replaces JNI allocation through a Mockito factory | Trace the real map/object construction, including its actual bridge allocation                                          |
| `native_to_js`      | Unavailable; native emitters/OS delivery are replaced at host boundaries                                                                              | Correlate native emission and JS callback in one platform trace clock, retaining event/session IDs                      |
| `js_filter`         | Actual `createStepCountFilter`; 10 full warm-up passes and five measured passes                                                                       | `performance.now()` immediately around the same filter in the example callback                                          |
| `example_commit`    | Unavailable; Jest renderer timing is not a device baseline                                                                                            | Callback entry to the example's `useLayoutEffect` for changed step state, on the JS monotonic clock                     |

Native CSV parsing, processor reset, assertions and result-file I/O stay outside timed regions.
The processing loop and accepted-result consumption remain inside; the payload loop includes map reads and Mockito interception overhead.
Mockito invocation history is cleared between passes to bound host overhead.
Escape analysis is disabled by the existing test JVM setting; this does not configure the Android app.
Node runs under Jest's RN boundary mocks using `node:perf_hooks`, not Hermes.
Core Motion, real native-to-JS delivery, battery use, device CPU load, frame presentation and thermal behavior remain unmeasured on Linux.

## Raw result schema v1

Each `*-result.json` contains:

- `schemaVersion: 1` and `environment`: `node`, `jvm` or `device`.
- `metadata`: full Git `commit`, `dirty`, `fixtureHash`, OS/architecture `platform`, `runtime` version, library and React Native versions, monotonic `clock`, unique `runId`, UTC `createdAt`. Device results additionally require exact `device`, `build: "Release"` and `runtime: "Hermes <version>"`.
- `config`: positive `warmup` and `rounds`, plus Boolean `logging` and `rendering`. Host warm-up units are complete input passes; device units are milliseconds, with explicit `durationMs`.
- `unavailable`: explicit stage names with no measurement. A host result cannot claim delivery or rendering, even if a number was supplied.
- `records`: unique `(scenario, stage, round)` rows with positive `operations`, nonnegative `accepted` and `rejected` summing to operations, and finite nonnegative aggregate `durationNs`. Device commit rows also retain the number of `coalesced` updates.
- Device export additionally preserves per-observation durations in `observations`, allowing latency distributions rather than only means.

`node tests/benchmarks/results.mjs <files...>` rejects unsupported revisions/environments, malformed metadata, duplicate rows, invalid counts/timings and impossible host stage claims.
The host runner also requires all expected rows (25 JS or 50 native) before publishing its result.
`*-records.json` is an intermediate array, not a validated standalone result.
Keep the complete result, fixture recipe, commit, command output and original device trace together.
Do not compare partial exports or omit failed runs.

## Release/Hermes device protocol

Use a dedicated test device; this guide does not authorize installation on an operator's phone.
Record model, OS/build, CPU architecture, battery level, thermal state, power connection, screen brightness, sensor/backend, requested rate, permissions, foreground/background state and toolchain versions with every run.
Record exact React Native, Hermes and library versions, full commit and a dirty-tree flag; save the diff when testing local changes.
Verify Hermes and the Release build in the installed binary before collecting data.

1. Set `BENCHMARK_ENABLED = true` in `example/src/benchmark.ts`. This arms 10 seconds of warm-up followed by a 60-second observation window and automatically stops the session after 70 seconds. Permission requests occur before this window. A manual early stop or truncated export is rejected by the capture converter.
2. Set `EXAMPLE_LOGGING_ENABLED` and `EXAMPLE_RENDERING_ENABLED` in `example/src/logging.ts` before a full rebuild. Collect `(false, false)` for filtering alone, `(false, true)` for UI commit cost, then `(true, true)` for logging overhead. Logging itself induces React updates; `(true, false)` does not isolate rendering. The default example remains logging/rendering on, benchmark off.
3. Build Android with `cd example/android && ./gradlew :app:assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a`. For iOS open `example/ios/StepCounterExample.xcworkspace`, select the physical device and the `StepCounterExample` scheme, set Run to Release and build with the project's normal signing setup. Do not use the documented Debug example scripts for baseline measurements. Close Metro/debuggers and avoid development menus and live consoles while timing.
4. On Android begin `adb logcat -v threadtime > capture.log` before launching; on iOS save the selected app's unified/device console log from Console or Xcode's device tools. Record the tool/version used. Start a single counting session, perform the named scenario through the full window, and keep the app foregrounded for the baseline. Collect background/batched scenarios separately with explicit screen/app state.
5. At stop, the example exports `STEP_BENCHMARK` start, one small JSON line per observation and an end count. This happens outside timed regions, avoiding platform line-size truncation of one giant JSON value. Keep one window per capture. Missing markers, missing lines, buffer overflow, multiple windows or early stop invalidate conversion; increase log capture capacity or reduce event rate and rerun, never silently discard observations.
6. Create `metadata.json` with `{ "scenario": "walking", "metadata": { ... } }` using all required schema fields above. Use the printed/generated `fixtures.sha256` for the fixture protocol identity, the actual tested commit/dirty flag, `clock: "JS performance.now"`, and the actual Hermes version. Add the device conditions listed above as metadata fields.
7. Convert and validate: `node tests/benchmarks/device.mjs capture.log metadata.json device-result.json`, then `node tests/benchmarks/results.mjs device-result.json`. The converter retains observations and counts coalesced updates. It records native stages as unavailable because this export measures JS filtering and React commit latency only.

The example stores at most 20,000 observations.
Events crossing warm-up/end boundaries are excluded; `omitted` counts overflow, and the converter refuses a lossy result.
Filter observations include both accepted and rejected inputs.
Commit latency starts at the earliest accepted callback contributing to that commit and includes JS scheduling, filtering, parsing and React work.
Several callbacks may share one commit; `coalesced` records the additional callbacks, so commit operations are not delivered-event counts.
It excludes GPU presentation, animation completion and unrelated logging-only commits; use platform frame traces for those.
The default UI layout and style are unchanged.

## Native and delivery traces on devices

Capture Android with Perfetto/System Trace and iOS with Instruments Time Profiler plus Points of Interest, using the same Release/Hermes conditions and 10-second/60-second windows.
For a temporary instrumented measurement build, mark native callback processing, payload construction, emission immediately before the generated emitter and JS callback entry with a shared sequence/session ID.
Place iOS markers around the actual `CMPedometer` callback/payload path, not around the Android synthetic recipe.
Retain the instrumentation diff and tracing overhead baseline with the run; this harness does not ship these native probes or claim their results.

Use a cross-language trace source whose timestamps the platform tooling puts on one monotonic timeline.
If that correlation is unavailable, leave `native_to_js` unavailable and report separate native/JS durations.
Never subtract Android `SensorEvent.timestamp`, iOS measurement dates, Unix `startDate`/`endDate` or JS `performance.now()` from one another.
Core Motion aggregate measurement intervals do not reveal sample-to-callback latency.
For an externally extracted native/delivery result, use schema-v1 records, specify the trace clock/source and event matching method in metadata, and retain the original trace as evidence.
Numeric schema validation checks shape, not the truth of a trace correlation or the accuracy of a sensor.

## Repeatability and comparison

Run at least five independent fresh-process device captures per scenario/configuration after the fixed warm-up, alternating baseline/candidate order (AB, BA).
Keep the device, OS, backend, rate, fixture hash, runtime, build settings, screen/app state and tracing settings fixed; do not compare JVM/Node results with ART/Hermes or Android with iOS.
Keep raw rounds and distributions; report median, range, p95 and operations/second or ns/operation with their denominator.
Never average commit and filter operations together or call their difference native delivery latency.
Stationary runs may have no emitted step events; report that absence explicitly rather than inventing zero latency, and use native traces for stationary processing cost.
For teardown, continue tracing for 10 seconds after stop, check no new owned callbacks/producers, then restart and verify a fresh session.
Use a separate long-duration run for leak/battery studies, with its duration and sampling protocol recorded; a 60-second replay is not battery evidence.
Mark thermal throttling, missing events, clock-correlation failures and instrumented-vs-uninstrumented differences instead of treating them as faster runs.
Architecture decisions require repeatable device evidence; CI timing variation alone is not a regression verdict.
