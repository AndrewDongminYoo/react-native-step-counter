# Release device baselines

Issue: [#109](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/109).
Procedure and schema: [benchmarking](../benchmarking.md), delivered by #108.

## Contract

Collect reproducible Release/Hermes device evidence before choosing a native rewrite.
Keep Android hardware step counter, Android accelerometer fallback and iOS CMPedometer results separate.
Host replay, simulator runs and schema validation cannot satisfy the device baseline requirement.

## Scope and comparison

Use the existing harness and preserve the library API and default example behavior.
Freeze full baseline/candidate commits, instrumentation patches and build settings before collecting paired runs.
The existing Android running-sums optimization (#128) is a comparison candidate; its JVM legacy fixture is not an installable device baseline.
Prepare equivalent Release builds containing the original and optimized processor with identical capture instrumentation, and review their source differences before timing.
Do not attribute unrelated changes between historical commits to that optimization.
Hardware-counter and CMPedometer paths have no proposed replacement in this task; record their current baseline and label unchanged controls explicitly rather than inventing optimized implementations.
Any broader Kotlin/TurboModule comparison must identify an actual candidate first.
Sampling-rate, batching, worker-thread and architecture changes require a demonstrated bottleneck and comparable accuracy, and are outside initial measurement collection.

## Acceptance

- Retain raw logs, original platform traces, validated result files, metadata, commands and patches for all three backends.
- Follow the existing five-scenario protocol, three logging/rendering configurations, fixed warm-up/window and at least five independent captures per compared variant and cell, alternating baseline/candidate order.
- Confirm the selected backend from device evidence; a hardware-counter run does not cover fallback. Any benchmark-only fallback selection must remain outside the public API and be included in the recorded patch.
- Record device/OS, exact commit/toolchain/runtime, sensor rate, power, thermal and app conditions, fixture identity, and instrumentation overhead.
- Report event rate, sensor-to-JS p50/p95/p99, detector CPU/allocations, JS/frame cost, memory/teardown, energy, binary size and clean build time. Mark unsupported or unobservable metrics `[UNKNOWN]` with a reason.
- Separate OS detection latency, native processing, binding delivery and JS/React costs. Cross-clock subtraction is invalid without verified correlation.
- Pair material CPU/latency/energy claims with comparable repeated measurements and accuracy checks against an independently recorded step count. Synthetic correctness fixtures alone do not establish gait accuracy.
- Keep failed runs and exclusions visible. An empty stationary event stream is absence of observations, not zero latency.
- Keep #109 open until raw before/after evidence and reproducible procedures satisfy its completion condition. A preparation-only change must not close it.

## Device and review constraints

Use dedicated physical test devices where available.
The daily iPhone requires separate authorization for each device write; the issue and loop do not authorize installation or launch on it.
The operator requested restoration of the existing example UI and explicit measurement status after the first device attempts.
Keep the original step display and logs enabled for operator-assisted builds, show a sensor-independent counting label and benchmark phase/countdown, and wait for explicit START in benchmark mode.
Retain fatal-error and no-event completion messages without relying on the log panel.
This status UI requires operator visual approval before merge; it does not authorize another daily-iPhone installation or launch.
Physical movement, accuracy ground truth and unavailable sensor backends remain operator/device prerequisites.
The operator confirmed walking during the second zero-observation window and reported that wired walking is impractical; pause further wired walking runs.
