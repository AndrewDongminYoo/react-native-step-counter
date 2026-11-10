# React-Native Step Counter Library

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M8Q4QZ7)

한국어 사용자는 [Korean version.](README.kr.md)를 참조하십시오.

This library provides an interface for tracking the number of steps taken by the user in a React Native app. It uses the Android `StepCounter` sensor, an accelerometer fallback on Android devices without a step counter sensor, and Apple's `Core Motion` framework on iOS.

## Installation

```shell
npm install react-native-step-counter-newarch
```

```shell
yarn add react-native-step-counter-newarch
```

Native modules will automatically connect after React Native 0.60 version. So you don't need to link the native modules manually.

## Requirements

- React Native `>=0.71.0`
- React Native CLI apps. Expo Go is not supported because this package includes native code.

### ANDROID

Add the motion permission and sensor feature declarations if your app does not already include them.

```xml
<!--  android/src/main/AndroidManifest.xml-->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.stepcounter">
  <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
  <uses-permission android:name="android.permission.BODY_SENSORS_BACKGROUND" />

  <uses-feature
    android:name="android.hardware.sensor.stepcounter"
    android:required="false" />
  <uses-feature
    android:name="android.hardware.sensor.accelerometer"
    android:required="true" />
</manifest>
```

### iOS

Add `NSMotionUsageDescription` to your app's `Info.plist`.

```xml plist
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
  ...
  <key>NSMotionUsageDescription</key>
  <string>We want to access your motion data to count your steps.</string>
  ...
</plist>
```

## Interface

- `isStepCountingSupported()`: `Promise<{ supported: boolean; granted: boolean }>`: method to check if the device has a feature related step counter or accelerometer.
  - `supported` reports whether a counting sensor is present. On Android, either an actual step counter or an accelerometer is sufficient; a hardware feature flag alone is not.
  - `granted` reports permission independently of hardware availability. On Android 10 (API 29) and later, this package requires `ACTIVITY_RECOGNITION` for both backends and never uses the accelerometer to bypass a denial. On API 24–28, that runtime permission is not required, so `granted` is `true`.
  - Request permission when needed, then check capabilities again before starting. The existing Android-only runtime `working` field indicates successful sensor registration until stop or host destruction; it does not guarantee sensor delivery and is not part of the public TypeScript result type.

- `startStepCounterUpdate(start: Date, callBack: StepCountUpdateCallback)`: `EventSubscription`:
  - The returned handle owns the current native session. Calling its `remove()` stops sensors and removes that listener, including when debug listeners remain subscribed. Repeated removal is safe. Starting again replaces the previous handle; removing an older handle cannot stop the replacement.
  - If stopping the previous session throws during replacement, its listener is removed and the error propagates before a new listener or native session starts. A synchronous native start error also removes the new listener, attempts native cleanup and preserves the original start error.
  - iOS live updates exclude activity before the call, including when `start` is in the past. Steps, distance, and floors subtract the cumulative baseline from `start` to the call time; emitted `startDate` is that cutoff and `endDate` is the sample measurement time. Future origins clamp to the call time.
  - An unavailable baseline or current distance/floor metric yields `null`; a metric with an unknown baseline stays `null` for that session. If the baseline query fails or returns no data, the first valid live sample establishes every baseline and its end date becomes `startDate`; that sample is not emitted.
  - iOS ignores zero-step, stale, and decreasing windows without lowering baselines. A correction can pause delivery until cumulative metrics recover; it does not add historical activity on recovery.
  - The native iOS `queryStepCounterDataBetweenDates` method returns the historical interval and unadjusted totals available from Core Motion. It is separate from live sessions and is not exposed by this TypeScript wrapper.
  - Android refreshes permission and sensors on every start, stops the previous backend, and prefers the hardware step counter.
  - If the hardware counter is absent or registration fails, Android tries an available accelerometer only while permission remains allowed. Missing sensors, denied permission, or failed registrations leave native counting stopped; no sensor metadata is emitted for a failed registration. The returned JS subscription alone does not confirm native registration.

- `stopStepCounterUpdate(): void`:
  - Removes the current owned subscription and stops the native sensor session. Stop is safe before start and on repeated calls; independent debug listeners remain registered.
  - Removing the last native emitter listener or invalidating the React Native runtime also stops native producers. Android host destruction releases its sensor and lifecycle registration. iOS releases pedometer updates and motion callbacks, including queued callbacks from retired sessions.
  - Activity pause alone does not stop a session. Background delivery follows OS restrictions; this library does not provide a foreground service, guaranteed background counting, or app-killed tracking. Device energy impact has not been measured.

- `createStepCountFilter(options?: StepCountFilterOptions)`: `(data: StepCountData) => StepCountData | null`:
  - Creates a stateful live-update filter for sensor false positives such as hand rotation.
  - The filter compares cumulative steps with elapsed measurement time since `startDate` using `minimumStepIntervalMs` (default 250 ms), preserving valid batches even when reports arrive close together. Totals that exceed this session budget are rejected and rebased out of later steps and distance. False steps hidden by earlier idle time cannot be identified by this conservative check.
  - Invalid counts/dates/distances, duplicate or backwards end dates, and decreasing same-session steps/distances are ignored without resetting totals. A newer `startDate` starts a fresh session; older sessions are ignored. A backend switch at the same start date requires a newer end date and retires the old backend until the next session.
  - When distance is unavailable, the filter preserves `null` and continues processing steps. Only observed distance increments between adjacent numeric reports can be removed for rejected bursts; increments across unavailable intervals cannot be attributed and remain uncorrected.
  - Create one filter per subscription. Recreate it for a counter reset or restart that reuses the same `startDate` and backend, or a switch back to a retired backend; cumulative values alone cannot identify those boundaries. Explicit session/backend boundaries may restart at a smaller total.
  - Native hardware/OS pedometers can still report false positives before the package receives the event. Use this helper when your app needs stricter live-session counts than the raw sensor stream.

- `StepCountData`:
  - **Common Interface**
    - `steps`: This is a number property that indicates the number of steps taken by the user during the specified time period.
    - `startDate`: This is a number property that indicates the start date of the data in Unix timestamp format, measured in milliseconds.
    - `endDate`: This is a number property that indicates the end date of the data in Unix timestamp format, measured in milliseconds.
      On Android, this is the sensor measurement time mapped to epoch milliseconds using a fixed clock anchor captured at session start.
      Delayed or batched delivery and wall-clock changes during that session do not alter measurement intervals; restarting captures a new anchor.
    - `distance`: Distance in meters (`number | null`). Android estimates it as steps × 0.762; iOS reports `null` when unavailable. A measured zero remains `0`.
    - `counterType`: (`CounterType`) The name of the sensor used to count the number of steps. One of `"CMPedometer"` (iOS), `"STEP_COUNTER"` (Android hardware sensor), or `"ACCELEROMETER"` (Android fallback).

  - **iOS Only**
    - `floorsAscended`: This is a number property that indicates the number of floors the user has ascended during the specified time period. Its type is `number | null | undefined`: iOS sends `null` when unavailable; Android omits this field.
    - `floorsDescended`: This is a number property that indicates the number of floors the user has descended during the specified time period. Its type is `number | null | undefined`: iOS sends `null` when unavailable; Android omits this field.

## Payload compatibility

Unavailable distance remains `null` in raw callbacks and filtered output; `parseStepData` returns `"N/A"` for it.
This replaces the filter's previous zero/last-distance substitution.
Strict TypeScript consumers must guard nullable distance before arithmetic or formatting:

```typescript
const distanceLabel = data.distance === null ? "N/A" : `${data.distance.toFixed(1)}m`;
const floorsLabel = data.floorsAscended == null ? "N/A" : `${data.floorsAscended}`;
```

Android runtime discriminators now match the declared `CounterType` union.
Replace comparisons against `"Step Counter"` or `"Accelerometer"` with `"STEP_COUNTER"` or `"ACCELEROMETER"`.
The callback signature and public export names remain unchanged.

## Usage

To use the Step Counter Library in your React Native app, follow these steps:

Import the library into your React Native app.

```typescript
import React, { useEffect, useState } from "react";
import {
  createStepCountFilter,
  isStepCountingSupported,
  parseStepData,
  startStepCounterUpdate,
  stopStepCounterUpdate,
} from "react-native-step-counter-newarch";
```

Use the `isStepCountingSupported` method to check if the device has a step counter or accelerometer sensor.

```typescript
const [supported, setSupported] = useState(false);
const [granted, setGranted] = useState(false);

async function askPermission() {
  isStepCountingSupported().then((result) => {
    console.debug("🚀 - isStepCountingSupported", result);
    setGranted(result.granted === true);
    setSupported(result.supported === true);
  });
}
```

Call the `startStepCounterUpdate` method to start the step counter service.

```typescript
const [steps, setSteps] = useState(0);

async function startStepCounter() {
  const filterStepCountData = createStepCountFilter();

  startStepCounterUpdate(new Date(), (data) => {
    const filteredData = filterStepCountData(data);
    if (!filteredData) {
      return;
    }

    console.debug(parseStepData(filteredData));
    setSteps(filteredData.steps);
  });
}
```

Here's an example of a complete React component that uses the `NativeStepCounter`.

Link to Example Application: [here](https://github.com/AndrewDongminYoo/react-native-step-counter/blob/main/example/src/App.tsx)

## Change Log

See the [`Release Notes`](CHANGELOG.md) for a list of changes.

## Contributing

See the [`Contributing Guide`](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
