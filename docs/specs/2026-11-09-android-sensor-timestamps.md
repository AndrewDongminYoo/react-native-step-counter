# Android sensor measurement timestamps

## Contract

Issue #96 requires delivery-independent Android step counts and measurement dates.
The primary sources are [issue #96](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/96), `SensorListenService.kt`, and `AccelerometerService.kt`.

Pass `SensorEvent.timestamp` into both detectors and use it for the accelerometer's existing 250 ms refractory interval.
Keep the thresholds, sampling policy, hardware baseline semantics, permissions, and TypeScript API unchanged.
Drop duplicate or backwards timestamps before they mutate detector state.

At each session start, capture an epoch-millisecond wall clock and `SystemClock.elapsedRealtimeNanos()` anchor.
Map each emitted measurement to `anchorEpochMillis + (eventTimestampNs - anchorElapsedNs) / 1_000_000`.
Keep that anchor fixed until restart so delayed callbacks and wall-clock adjustments cannot distort chronology.
Elapsed realtime includes deep sleep; callback execution time and uptime do not determine measurement dates or step intervals.
Keep the caller's normalized `startDate` independent of the anchor, including historical starts.
Before an emitted measurement, the internal end date defaults to the session anchor's epoch time.

Serialize detector resets, sample updates, payload snapshots, and step-event emission with one service state lock.
Serialize service start/stop separately and call sensor registration APIs outside the state lock to avoid waiting on hardware while blocking callbacks.
Stopping waits for an in-flight emission and prevents subsequent sample processing until registration succeeds again.
This service-level contract does not redesign module or JS subscription ownership from #95.

## Acceptance

- Real hardware-counter and accelerometer services produce identical counts and epoch-millisecond dates when identical measurements are delivered immediately, late, or in batches.
- Wall-clock jumps during a session do not change measurement chronology; restart obtains a fresh anchor.
- A replay containing a suspend interval retains the full elapsed interval in dates and debounce decisions.
- Timestamp ordering and restart regressions protect detector state and reset the refractory window and hardware baseline.
- A competing reset/stop cannot interleave with sample processing and emission.
- Native JVM tests run locally and in the existing Linux/JDK 17 Android CI job, followed by the Android example build.
- Jest, TypeScript, distributable build, and scoped Trunk checks pass.

## Limits and references

No device accuracy, power, or sensor availability claim follows from replay fixtures.
No UI change requires visual approval.
Detector optimization (#97), JS filtering (#98), dependency upgrades, and broader lifecycle ownership (#95) are outside scope.

[Android SensorEvent.timestamp](https://developer.android.com/reference/android/hardware/SensorEvent#timestamp) shares the elapsed-realtime nanosecond time base.
[Android SystemClock](https://developer.android.com/reference/android/os/SystemClock) documents deep sleep and mutable wall-clock behavior.
