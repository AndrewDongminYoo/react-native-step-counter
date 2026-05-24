# React-Native Step Counter Library

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M8Q4QZ7)

한국어 사용자는 [Korean version.](README.kr.md)를 참조하십시오.

This library provides an interface for tracking the number of steps taken by the user in a React Native app. It uses the Android `StepCounter` sensor, an accelerometer fallback on Android devices without a step counter sensor, and Apple's `Core Motion` framework on iOS.

## Installation

```shell
npm install @dongminyu/react-native-step-counter
```

```shell
yarn add @dongminyu/react-native-step-counter
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
  - One key for the response object is `granted`, whether the app user has granted this feature permission, and `supported` is whether the device supports this feature.
  - Android can fall back to accelerometer-based counting when the hardware step counter is unavailable. You should still request and respect the platform motion/activity permission before starting updates.

- `startStepCounterUpdate(start: Date, callBack: StepCountUpdateCallback)`: `EventSubscription`:
  - If the pedometer sensor is available and supported on the device, register it with the listener in the sensor manager, and return the step count event listener.
  - If the pedometer sensor is not supported by the device or is not available, register the accelerometer sensor with the listener, generate an accel event through a vector algorithm filter and receive it to the app.

- `stopStepCounterUpdate(): void`:
  - Removes the subscription registered by `startStepCounterUpdate` and stops the native sensor session.

- `createStepCountFilter(options?: StepCountFilterOptions)`: `(data: StepCountData) => StepCountData | null`:
  - Creates a stateful live-update filter for sensor false positives such as hand rotation.
  - The filter drops bursts that imply a cadence faster than `minimumStepIntervalMs` and rebases later cumulative values so ignored steps do not come back on the next accepted event.
  - Native hardware/OS pedometers can still report false positives before the package receives the event. Use this helper when your app needs stricter live-session counts than the raw sensor stream.

- `StepCountData`:
  - **Common Interface**
    - `steps`: This is a number property that indicates the number of steps taken by the user during the specified time period.
    - `startDate`: This is a number property that indicates the start date of the data in Unix timestamp format, measured in milliseconds.
    - `endDate`: This is a number property that indicates the end date of the data in Unix timestamp format, measured in milliseconds.
    - `distance`: This is a number property that indicates the distance in meters that the user has walked or run during the specified time period.
    - `counterType`: (`CounterType`) The name of the sensor used to count the number of steps. One of `"CMPedometer"` (iOS), `"STEP_COUNTER"` (Android hardware sensor), or `"ACCELEROMETER"` (Android fallback).

  - **iOS Only**
    - `floorsAscended`: This is a number property that indicates the number of floors the user has ascended during the specified time period. It can be nil if the device does not support this feature.
    - `floorsDescended`: This is a number property that indicates the number of floors the user has descended during the specified time period. It can be nil if the device does not support this feature.

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
} from "@dongminyu/react-native-step-counter";
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
