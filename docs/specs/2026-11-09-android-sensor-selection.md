# Android Sensor Selection

Issue: [#91](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/91).

## Problem

Android selects a backend at module construction using permission alone, reports accelerometer presence as a grant, and ignores failed sensor registration.
A later grant cannot upgrade the cached backend, and a missing sensor can crash metadata emission.

## Contract

- Query actual `SensorManager` sensors rather than relying on feature flags.
- `supported` means a step counter or accelerometer is present, independent of permission.
- `granted` means activity recognition is allowed on API 29+, or no activity runtime permission is required on API 24–28.
- Preserve the existing consent policy: on API 29+, denial prevents both hardware and accelerometer counting, including fallback after registration failure.
- At each start, stop and detach the previous backend, refresh permission and sensors, prefer the hardware counter, then try the accelerometer if permitted and available.
- The existing Android runtime `working` field means a listener registered successfully and has not been stopped; it does not promise sensor delivery or walking accuracy.
  Keep the public JS result type unchanged.
- Missing sensors, failed registration, and permission changes must not crash or report successful counting.
- After requesting permission, the example checks native capabilities again before starting.

## Verification

Linux-runnable JVM tests exercise the real module and services with Android/RN boundaries replaced.
Cover API 24, 28, 29 and a later API; both sensors, each sensor alone, no sensors, misleading feature flags, denial, grant, revocation, late grant, backend replacement, registration false and `SecurityException`.
Preserve the seven existing hardware session regressions.
Run the complete Jest suite, typecheck, package build/pack, scoped Trunk checks, and current-head native CI, including actual JVM test execution.
Physical sensor delivery and walking accuracy remain device verification limits.

## Scope Boundaries

No public API, dependency, state management, sensor algorithm or manifest changes.
Settings-return recovery and cancellation remain #106; broader lifecycle races remain #95; structured errors remain #107; payload normalization remains #94.
No layout or visual assets change, so operator visual approval is not applicable.

## Sources

- [Issue #91](https://github.com/AndrewDongminYoo/react-native-step-counter/issues/91) supplies the acceptance boundary.
- `android/src/main/java/com/stepcounter/StepCounterModule.kt` owns selection and capability reporting.
- `android/src/main/java/com/stepcounter/services/SensorListenService.kt` owns registration and runtime status.

The API 29 permission boundary follows [Android motion sensor documentation](https://developer.android.com/develop/sensors-and-location/sensors/sensors_motion#sensors-motion-stepcounter).
Gating the accelerometer as well is this package's existing README consent policy.
