# Typed native events

## Problem and approved scope

Issue #101 replaces manual device-emitter dispatch with the RN 0.88 Codegen event contract on Android and iOS.
Keep the supported RN `~0.88.0`, React `~19.3.0`, New Architecture runtime and the existing callback/subscription API.

## Contract

- Declare `onStepCounterUpdate`, `onStepDetected`, `onErrorOccurred` and `onStepsSensorInfo` as generated events.
- Preserve step payloads, including nullable metrics and millisecond dates.
- Represent errors as serializable `{ code, message }` strings; retain platform-specific sensor metadata as typed optional fields with a required sensor name.
- Export matching subscription functions for independent diagnostics and raw step listeners.
- `startStepCounterUpdate(start, callback)` still owns native teardown; replacement, failed start, repeated/stale handle removal and explicit stop retain their behavior.
- Generated raw/diagnostic subscriptions own only their listeners; removing them does not stop producers.
- Remove manual JS emitter assertions, Android device dispatch and iOS bridge/callableJSModules overrides.
- Keep native-only iOS historical query and motion entry points internal, outside the Codegen/public JS API.

## Acceptance

Run JS adapter and diagnostic delivery/removal regressions, native callback/lifecycle suites, generated schema and Android/iOS builds including packed consumers.
Check generated callback transport separately from sensor algorithms and from bridgeless runtime delivery.
Verify that listeners are registered before synchronous native emission, and that teardown never affects an independent listener.
Exercise a bridgeless runtime without the custom iOS transport; report actual observed payloads and any unavailable physical sensor coverage.

## Boundaries

No version bump, release, dependency upgrade, new state management, sensor algorithm change, C++/Nitro migration or physical iPhone write.
No layout/style/motion change, so operator visual approval is not applicable.
Sensor accuracy, energy and real-device walking are outside deterministic fixture coverage.
